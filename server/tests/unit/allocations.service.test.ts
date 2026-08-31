import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { ConflictError, ForbiddenError, InsufficientQuantityError, NotFoundError, ValidationError } from '../../src/errors';
import { allocate, release } from '../../src/modules/allocations/allocations.service';
import { asAuthenticatedUser, createTestSeedLot, createTestUser } from '../factories';

// These are "unit" tests for the allocation business logic in the sense
// that matters here: the logic under test IS a transaction (row lock,
// quantity check, CHECK-constraint interaction), so mocking `pg` would
// exercise nothing meaningful. Instead they run against the isolated
// seedflow_test database (see ../setupEnv.ts) with no HTTP layer involved —
// every call below goes directly through allocations.service, not Express.
describe('allocations.service', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('allocate', () => {
    it('allocates the requested quantity and increments quantity_allocated', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ quantityTotal: 500, quantityAllocated: 0 });

      const { allocation, seedLot } = await allocate(
        lot.id,
        { quantity: 120, allocatedTo: 'Farmer: Test' },
        asAuthenticatedUser(admin),
      );

      expect(allocation.quantity).toBe(120);
      expect(allocation.status).toBe('allocated');
      expect(Number(seedLot.quantity_allocated)).toBe(120);
    });

    it('rejects a non-positive quantity', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot();

      await expect(allocate(lot.id, { quantity: 0, allocatedTo: 'x' }, asAuthenticatedUser(admin))).rejects.toThrow(
        ValidationError,
      );
      await expect(allocate(lot.id, { quantity: -5, allocatedTo: 'x' }, asAuthenticatedUser(admin))).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects an empty allocatedTo', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot();

      await expect(allocate(lot.id, { quantity: 10, allocatedTo: '   ' }, asAuthenticatedUser(admin))).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws NotFoundError for a seed lot that does not exist', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      await expect(
        allocate('00000000-0000-0000-0000-000000000000', { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(admin)),
      ).rejects.toThrow(NotFoundError);
    });

    it('refuses to allocate from an archived lot', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ status: 'archived' });

      await expect(allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(admin))).rejects.toThrow(
        ConflictError,
      );
    });

    it('throws InsufficientQuantityError when the request exceeds what is available', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ quantityTotal: 100, quantityAllocated: 90 });

      await expect(allocate(lot.id, { quantity: 20, allocatedTo: 'x' }, asAuthenticatedUser(admin))).rejects.toThrow(
        InsufficientQuantityError,
      );
    });

    it('allows exactly the remaining available quantity (boundary)', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ quantityTotal: 100, quantityAllocated: 90 });

      const { seedLot } = await allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(admin));
      expect(Number(seedLot.quantity_allocated)).toBe(100);
    });

    it('blocks a Producer from allocating a lot owned by a different organization', async () => {
      const lot = await createTestSeedLot();
      const outsider = await createTestUser({ role: 'Producer' });

      await expect(
        allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(outsider)),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows a Producer to allocate a lot owned by their own organization', async () => {
      const producer = await createTestUser({ role: 'Producer' });
      const lot = await createTestSeedLot({ organizationId: producer.organizationId! });

      const { allocation } = await allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(producer));
      expect(allocation.quantity).toBe(10);
    });

    it('lets Admin and Warehouse Manager bypass ownership entirely', async () => {
      const lot = await createTestSeedLot();
      const admin = await createTestUser({ role: 'Admin' });
      const warehouse = await createTestUser({ role: 'Warehouse Manager' });

      await expect(allocate(lot.id, { quantity: 5, allocatedTo: 'x' }, asAuthenticatedUser(admin))).resolves.toBeDefined();
      await expect(allocate(lot.id, { quantity: 5, allocatedTo: 'y' }, asAuthenticatedUser(warehouse))).resolves.toBeDefined();
    });

    it('serializes two concurrent allocations so the combined total never exceeds capacity', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ quantityTotal: 100, quantityAllocated: 0 });

      const results = await Promise.allSettled([
        allocate(lot.id, { quantity: 70, allocatedTo: 'a' }, asAuthenticatedUser(admin)),
        allocate(lot.id, { quantity: 70, allocatedTo: 'b' }, asAuthenticatedUser(admin)),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientQuantityError);

      const finalLot = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);
      expect(Number(finalLot.rows[0].quantity_allocated)).toBe(70);
    });
  });

  describe('release', () => {
    it('releases an allocation and decrements quantity_allocated back', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot({ quantityTotal: 200, quantityAllocated: 0 });
      const { allocation } = await allocate(lot.id, { quantity: 50, allocatedTo: 'x' }, asAuthenticatedUser(admin));

      const { allocation: released, seedLot } = await release(allocation.id, {}, asAuthenticatedUser(admin));
      expect(released.status).toBe('released');
      expect(Number(seedLot.quantity_allocated)).toBe(0);
    });

    it('refuses to release the same allocation twice', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot();
      const { allocation } = await allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(admin));

      await release(allocation.id, {}, asAuthenticatedUser(admin));
      await expect(release(allocation.id, {}, asAuthenticatedUser(admin))).rejects.toThrow(ConflictError);
    });

    it('throws NotFoundError for an allocation that does not exist', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      await expect(release('00000000-0000-0000-0000-000000000000', {}, asAuthenticatedUser(admin))).rejects.toThrow(
        NotFoundError,
      );
    });

    it('blocks a Producer from releasing an allocation on another organization\'s lot', async () => {
      const admin = await createTestUser({ role: 'Admin' });
      const lot = await createTestSeedLot();
      const { allocation } = await allocate(lot.id, { quantity: 10, allocatedTo: 'x' }, asAuthenticatedUser(admin));

      const outsider = await createTestUser({ role: 'Producer' });
      await expect(release(allocation.id, {}, asAuthenticatedUser(outsider))).rejects.toThrow(ForbiddenError);
    });
  });
});
