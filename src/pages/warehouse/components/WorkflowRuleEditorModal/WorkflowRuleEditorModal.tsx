import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Plus, Trash2, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { 
  WorkflowRule, 
  WorkflowTrigger, 
  WorkflowAction, 
  WorkflowCondition 
} from '@/types/warehouse';
import styles from './WorkflowRuleEditorModal.module.css';

interface WorkflowRuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: WorkflowRule;
  onSave: (data: any) => void;
}

export const WorkflowRuleEditorModal: React.FC<WorkflowRuleEditorModalProps> = ({ isOpen, onClose, rule, onSave }) => {
  const [formData, setFormData] = useState<Partial<WorkflowRule>>({
    name: '',
    description: '',
    trigger: 'GRN created',
    conditions: [],
    conditionLogic: 'AND',
    actions: [],
    active: true
  });

  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (rule) setFormData(rule);
    else setFormData({ name: '', description: '', trigger: 'GRN created', conditions: [], conditionLogic: 'AND', actions: [], active: true });
    setTestResult(null);
  }, [rule, isOpen]);

  const addCondition = () => {
    const newCondition: WorkflowCondition = { field: 'amount', operator: 'greater than', value: '' };
    setFormData(prev => ({ ...prev, conditions: [...(prev.conditions || []), newCondition] }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({ ...prev, conditions: prev.conditions?.filter((_, i) => i !== index) }));
  };

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.map((c, i) => i === index ? { ...c, ...updates } : c)
    }));
  };

  const addAction = () => {
    const newAction = { action: 'Notify users' as WorkflowAction, config: {} };
    setFormData(prev => ({ ...prev, actions: [...(prev.actions || []), newAction] }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({ ...prev, actions: prev.actions?.filter((_, i) => i !== index) }));
  };

  const updateAction = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.map((a, i) => i === index ? { ...a, ...updates } : a)
    }));
  };

  const handleTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setTestResult('Would have triggered 3 times in the last 30 days. Most recent: GRN-2026-0089 on 24 Apr 2026.');
      setIsTesting(false);
    }, 1500);
  };

  const triggers: WorkflowTrigger[] = [
    'GRN created', 'GRN inspected', 'Low stock detected', 'Cycle count variance', 
    'Adjustment posted', 'Cold zone temperature breach', 'Sensor offline', 
    'Germination decline alert', 'Dispatch order created', 'Material issue requested', 'Return initiated'
  ];

  const actionTypes: WorkflowAction[] = [
    'Notify users', 'Auto-approve', 'Auto-reject', 'Block action', 
    'Create record', 'Trigger maintenance', 'Generate report', 'Send escalation'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? 'Edit workflow rule' : 'Create new workflow rule'}
      size="xl"
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Rule basics</h3>
          <div className={styles.basicsRow}>
            <div className={styles.flex2}>
              <Input
                label="Rule name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Auto-approve low value variances"
                required
              />
            </div>
            <div className={styles.flex1}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Active</label>
                <div className={`${styles.toggle} ${formData.active ? styles.active : ''}`} onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}>
                  <div className={styles.toggleHandle} />
                </div>
              </div>
            </div>
          </div>
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Briefly explain what this rule does..."
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Trigger</h3>
          <div className={styles.inputGroup}>
            <label className={styles.label}>When this happens:</label>
            <select
              className={styles.select}
              value={formData.trigger}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value as WorkflowTrigger }))}
            >
              {triggers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Conditions</h3>
            <div className={styles.logicToggle}>
              <span>When</span>
              <div className={styles.toggleGroup}>
                <button 
                  className={`${styles.toggleBtn} ${formData.conditionLogic === 'AND' ? styles.activeToggle : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, conditionLogic: 'AND' }))}
                >ALL</button>
                <button 
                  className={`${styles.toggleBtn} ${formData.conditionLogic === 'OR' ? styles.activeToggle : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, conditionLogic: 'OR' }))}
                >ANY</button>
              </div>
              <span>of these are true:</span>
            </div>
          </div>

          <div className={styles.builder}>
            {formData.conditions?.map((c, idx) => (
              <div key={idx} className={styles.builderRow}>
                <select 
                  className={styles.builderSelect}
                  value={c.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value })}
                >
                  <option value="amount">Amount</option>
                  <option value="quantity">Quantity</option>
                  <option value="reason">Reason</option>
                  <option value="severity">Severity</option>
                </select>
                <select 
                  className={styles.builderSelect}
                  value={c.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                >
                  <option value="equals">equals</option>
                  <option value="not equals">not equals</option>
                  <option value="greater than">greater than</option>
                  <option value="less than">less than</option>
                  <option value="between">between</option>
                  <option value="contains">contains</option>
                </select>
                <input 
                  className={styles.builderInput}
                  value={c.value}
                  onChange={(e) => updateCondition(idx, { value: e.target.value })}
                  placeholder="Value"
                />
                {c.operator === 'between' && (
                  <input 
                    className={styles.builderInput}
                    value={c.value2}
                    onChange={(e) => updateCondition(idx, { value2: e.target.value })}
                    placeholder="Value 2"
                  />
                )}
                <button className={styles.removeBtn} onClick={() => removeCondition(idx)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addCondition}>
              <Plus size={14} />
              <span>Add condition</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Then do:</h3>
          <div className={styles.builder}>
            {formData.actions?.map((a, idx) => (
              <div key={idx} className={styles.actionBlock}>
                <div className={styles.builderRow}>
                  <select 
                    className={styles.builderSelect}
                    value={a.action}
                    onChange={(e) => updateAction(idx, { action: e.target.value as WorkflowAction })}
                  >
                    {actionTypes.map(at => <option key={at} value={at}>{at}</option>)}
                  </select>
                  <div className={styles.rowControls}>
                    <button className={styles.iconBtn}><ArrowUp size={14} /></button>
                    <button className={styles.iconBtn}><ArrowDown size={14} /></button>
                    <button className={styles.removeBtn} onClick={() => removeAction(idx)}><Trash2 size={14} /></button>
                  </div>
                </div>
                
                <div className={styles.actionConfig}>
                  {a.action === 'Notify users' && (
                    <div className={styles.notifyConfig}>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Recipients</label>
                        <input className={styles.builderInput} placeholder="e.g. Warehouse Manager, Quality Team" />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Channels</label>
                        <div className={styles.checkboxGroup}>
                          {['Email', 'SMS', 'In-app'].map(c => (
                            <label key={c} className={styles.checkboxLabel}>
                              <input type="checkbox" defaultChecked={c === 'In-app'} />
                              <span>{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {a.action === 'Block action' && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Block reason (optional)</label>
                      <input className={styles.builderInput} placeholder="Message shown to user" />
                    </div>
                  )}
                  {a.action === 'Create record' && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Record type</label>
                      <select className={styles.select}>
                        <option>Purchase requisition</option>
                        <option>Stock movement</option>
                        <option>Cycle count</option>
                        <option>Audit task</option>
                      </select>
                    </div>
                  )}
                  {/* Other action configs would go here */}
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addAction}>
              <Plus size={14} />
              <span>Add action</span>
            </button>
          </div>
        </div>

        <div className={styles.testSection}>
          <div className={styles.testCard}>
            <div className={styles.testInfo}>
              <Activity size={20} className={styles.testIcon} />
              <div>
                <h4 className={styles.testTitle}>Test rule</h4>
                <p className={styles.testDesc}>Simulate this rule against historical events to see how often it would trigger.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleTest}>
              {isTesting ? 'Simulating...' : 'Run test'}
            </Button>
          </div>
          {testResult && (
            <div className={styles.testResult}>
              {testResult}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(formData)}>Save rule</Button>
        </div>
      </div>
    </Modal>
  );
};
