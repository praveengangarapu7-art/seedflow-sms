// Snapshot of the AI Center's real API output (server/src/modules/ai), taken
// from a local run over the seed:ai demo dataset. Served only when the backend
// is unreachable (demo mode), so the AI Center still demonstrates end to end.
// Regenerate by calling GET /api/v1/ai/lab-risk and /ai/forecasts.

import type { AiForecastReport, AiLabRiskReport } from './seedLotRealtimeClient';

export const DEMO_AI_LAB_RISK: Omit<AiLabRiskReport, 'generatedAt'> = {
  "summary": {
    "total": 19,
    "critical": 4,
    "high": 5,
    "medium": 2,
    "low": 8,
    "quantityAtRisk": 38600
  },
  "lots": [
    {
      "seedLotId": "ea8aee1f-8fc8-402c-a705-f1ad99b35771",
      "lotCode": "SL-AI-MZ-104",
      "crop": "Maize",
      "variety": "MMS Hybrid 9090",
      "stage": "Certified",
      "testingStatus": "testing",
      "quantityAvailable": 7100,
      "unit": "kg",
      "ageDays": 250,
      "germination": 79.5,
      "purity": 97.4,
      "viability": 80.5,
      "minGermination": 90,
      "predictedGermination90d": 77.1,
      "openQualityFlags": 0,
      "riskScore": 100,
      "riskLevel": "critical",
      "factors": [
        {
          "label": "Germination 79.5% is below the 90% minimum",
          "points": 77
        },
        {
          "label": "Physical purity 97.4% is below 98%",
          "points": 20
        },
        {
          "label": "Stored 250 days: label validity nearly over",
          "points": 20
        },
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade."
    },
    {
      "seedLotId": "7771c50c-003a-4898-bd81-af48fbb94acb",
      "lotCode": "SL-AI-MZ-102",
      "crop": "Maize",
      "variety": "MMS Hybrid 7711",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 6900,
      "unit": "kg",
      "ageDays": 210,
      "germination": 84,
      "purity": 98.6,
      "viability": 85,
      "minGermination": 90,
      "predictedGermination90d": 81.6,
      "openQualityFlags": 0,
      "riskScore": 75,
      "riskLevel": "critical",
      "factors": [
        {
          "label": "Germination 84% is below the 90% minimum",
          "points": 63
        },
        {
          "label": "Stored 210 days: ageing risk",
          "points": 12
        }
      ],
      "recommendation": "Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade."
    },
    {
      "seedLotId": "1eb9f018-211d-4628-8b42-a95138a569b3",
      "lotCode": "SL-AI-SF-901",
      "crop": "Sunflower",
      "variety": "KBSH-44",
      "stage": "Certified",
      "testingStatus": "not_submitted",
      "quantityAvailable": 2800,
      "unit": "kg",
      "ageDays": 245,
      "germination": 72,
      "purity": 97.6,
      "viability": 73,
      "minGermination": 70,
      "predictedGermination90d": 67.5,
      "openQualityFlags": 0,
      "riskScore": 75,
      "riskLevel": "critical",
      "factors": [
        {
          "label": "Germination 72% is within 3 points of the 70% minimum",
          "points": 25
        },
        {
          "label": "Physical purity 97.6% is below 98%",
          "points": 20
        },
        {
          "label": "Stored 245 days: label validity nearly over",
          "points": 20
        },
        {
          "label": "Never submitted for lab testing",
          "points": 10
        }
      ],
      "recommendation": "Submit a sample to the lab before any dispatch."
    },
    {
      "seedLotId": "1a4a4ee2-582c-4baa-b50f-b2c8473c55f8",
      "lotCode": "SL-AI-CT-202",
      "crop": "Cotton",
      "variety": "Bt Cotton MM-55",
      "stage": "Certified",
      "testingStatus": "rejected",
      "quantityAvailable": 3500,
      "unit": "kg",
      "ageDays": 230,
      "germination": 67,
      "purity": 97.9,
      "viability": 68.5,
      "minGermination": 65,
      "predictedGermination90d": 62.8,
      "openQualityFlags": 0,
      "riskScore": 72,
      "riskLevel": "critical",
      "factors": [
        {
          "label": "Germination 67% is within 3 points of the 65% minimum",
          "points": 25
        },
        {
          "label": "Physical purity 97.9% is below 98%",
          "points": 20
        },
        {
          "label": "Lot was rejected by the lab",
          "points": 15
        },
        {
          "label": "Stored 230 days: ageing risk",
          "points": 12
        }
      ],
      "recommendation": "Sell first: germination is forecast to fall to about 62.8% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season."
    },
    {
      "seedLotId": "d53c82a5-3c04-40b1-97fe-b3026562e568",
      "lotCode": "SL-AI-PD-402",
      "crop": "Paddy",
      "variety": "BPT 5204",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 10200,
      "unit": "kg",
      "ageDays": 260,
      "germination": 81,
      "purity": 98,
      "viability": 82.5,
      "minGermination": 80,
      "predictedGermination90d": 78.6,
      "openQualityFlags": 0,
      "riskScore": 53,
      "riskLevel": "high",
      "factors": [
        {
          "label": "Germination 81% is within 3 points of the 80% minimum",
          "points": 25
        },
        {
          "label": "Stored 260 days: label validity nearly over",
          "points": 20
        },
        {
          "label": "Physical purity 98% is close to the 98% limit",
          "points": 8
        }
      ],
      "recommendation": "Sell first: germination is forecast to fall to about 78.6% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season."
    },
    {
      "seedLotId": "6516a13c-22c6-4d54-9499-d9667853267a",
      "lotCode": "SL-AI-WH-502",
      "crop": "Wheat",
      "variety": "GW 322",
      "stage": "Foundation",
      "testingStatus": "certified",
      "quantityAvailable": 1600,
      "unit": "kg",
      "ageDays": 180,
      "germination": 84.5,
      "purity": 98.9,
      "viability": 85.5,
      "minGermination": 85,
      "predictedGermination90d": 82.1,
      "openQualityFlags": 0,
      "riskScore": 52,
      "riskLevel": "high",
      "factors": [
        {
          "label": "Germination 84.5% is below the 85% minimum",
          "points": 47
        },
        {
          "label": "Stored 180 days",
          "points": 5
        }
      ],
      "recommendation": "Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade."
    },
    {
      "seedLotId": "49e0db5f-f226-433e-af09-a34aba2522cd",
      "lotCode": "SL-AI-MZ-103",
      "crop": "Maize",
      "variety": "MMS Hybrid 9090",
      "stage": "Foundation",
      "testingStatus": "certified",
      "quantityAvailable": 3400,
      "unit": "kg",
      "ageDays": 95,
      "germination": 88,
      "purity": 99,
      "viability": 89,
      "minGermination": 90,
      "predictedGermination90d": 85.6,
      "openQualityFlags": 0,
      "riskScore": 51,
      "riskLevel": "high",
      "factors": [
        {
          "label": "Germination 88% is below the 90% minimum",
          "points": 51
        }
      ],
      "recommendation": "Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade."
    },
    {
      "seedLotId": "794148c4-d9a7-483d-b516-9c4fa7f19cb4",
      "lotCode": "SL-2026-003",
      "crop": "Maize",
      "variety": "Maize-Hybrid-22",
      "stage": "Certified",
      "testingStatus": "not_submitted",
      "quantityAvailable": 3000,
      "unit": "kg",
      "ageDays": 0,
      "germination": null,
      "purity": null,
      "viability": null,
      "minGermination": 90,
      "predictedGermination90d": null,
      "openQualityFlags": 0,
      "riskScore": 35,
      "riskLevel": "high",
      "factors": [
        {
          "label": "No germination test on record",
          "points": 25
        },
        {
          "label": "Never submitted for lab testing",
          "points": 10
        }
      ],
      "recommendation": "Submit a sample to the lab before any dispatch."
    },
    {
      "seedLotId": "2dbe6e9d-9e9c-4d4e-a60c-2f08a9a6edaa",
      "lotCode": "SL-AI-CH-701",
      "crop": "Chilli",
      "variety": "MMS Teja Hybrid",
      "stage": "Certified",
      "testingStatus": "testing",
      "quantityAvailable": 100,
      "unit": "kg",
      "ageDays": 200,
      "germination": 67.5,
      "purity": 96.8,
      "viability": 69,
      "minGermination": 60,
      "predictedGermination90d": 63.9,
      "openQualityFlags": 0,
      "riskScore": 35,
      "riskLevel": "high",
      "factors": [
        {
          "label": "Physical purity 96.8% is below 98%",
          "points": 20
        },
        {
          "label": "Stored 200 days: ageing risk",
          "points": 12
        },
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "Monitor: re-check at the next scheduled test and keep storage conditions in range."
    },
    {
      "seedLotId": "497384aa-9a6f-49ca-b068-32cfe731fb1c",
      "lotCode": "SL-2026-001",
      "crop": "Paddy",
      "variety": "Paddy-1010",
      "stage": "Certified",
      "testingStatus": "testing",
      "quantityAvailable": 5000,
      "unit": "kg",
      "ageDays": 0,
      "germination": null,
      "purity": null,
      "viability": null,
      "minGermination": 80,
      "predictedGermination90d": null,
      "openQualityFlags": 0,
      "riskScore": 28,
      "riskLevel": "medium",
      "factors": [
        {
          "label": "No germination test on record",
          "points": 25
        },
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "Submit a sample to the lab before any dispatch."
    },
    {
      "seedLotId": "f7455b09-ddd7-4cd7-82ee-e936486badce",
      "lotCode": "SL-AI-SB-301",
      "crop": "Soybean",
      "variety": "JS 20-34",
      "stage": "Certified",
      "testingStatus": "testing",
      "quantityAvailable": 6700,
      "unit": "kg",
      "ageDays": 120,
      "germination": 74,
      "purity": 98.4,
      "viability": 75,
      "minGermination": 70,
      "predictedGermination90d": 68,
      "openQualityFlags": 0,
      "riskScore": 23,
      "riskLevel": "medium",
      "factors": [
        {
          "label": "Germination margin is only 4.0 points",
          "points": 12
        },
        {
          "label": "Physical purity 98.4% is close to the 98% limit",
          "points": 8
        },
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "Sell first: germination is forecast to fall to about 68% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season."
    },
    {
      "seedLotId": "8addf858-80b7-477e-aa11-cfb1b7ca778b",
      "lotCode": "SL-AI-TM-601",
      "crop": "Tomato",
      "variety": "MMS Tomato Arka",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 35,
      "unit": "kg",
      "ageDays": 150,
      "germination": 82.5,
      "purity": 98.2,
      "viability": 83.5,
      "minGermination": 70,
      "predictedGermination90d": 80.1,
      "openQualityFlags": 0,
      "riskScore": 13,
      "riskLevel": "low",
      "factors": [
        {
          "label": "Physical purity 98.2% is close to the 98% limit",
          "points": 8
        },
        {
          "label": "Stored 150 days",
          "points": 5
        }
      ],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "8ba2939e-6c04-4a13-bc69-24e213c68ab5",
      "lotCode": "SL-AI-MZ-101",
      "crop": "Maize",
      "variety": "MMS Hybrid 7711",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 5400,
      "unit": "kg",
      "ageDays": 40,
      "germination": 93,
      "purity": 99.2,
      "viability": 94,
      "minGermination": 90,
      "predictedGermination90d": 90.6,
      "openQualityFlags": 0,
      "riskScore": 12,
      "riskLevel": "low",
      "factors": [
        {
          "label": "Germination margin is only 3.0 points",
          "points": 12
        }
      ],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "ee89d1a1-4472-4da1-a4a3-fb455dd851b7",
      "lotCode": "SL-AI-CT-201",
      "crop": "Cotton",
      "variety": "Bt Cotton MM-55",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 2200,
      "unit": "kg",
      "ageDays": 60,
      "germination": 75,
      "purity": 98.1,
      "viability": 76.5,
      "minGermination": 65,
      "predictedGermination90d": 70.8,
      "openQualityFlags": 0,
      "riskScore": 8,
      "riskLevel": "low",
      "factors": [
        {
          "label": "Physical purity 98.1% is close to the 98% limit",
          "points": 8
        }
      ],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "c0848421-c998-4676-ad3a-d6561ac7f655",
      "lotCode": "SL-AI-WH-501",
      "crop": "Wheat",
      "variety": "HD 2967",
      "stage": "Certified",
      "testingStatus": "testing",
      "quantityAvailable": 16500,
      "unit": "kg",
      "ageDays": 20,
      "germination": 91,
      "purity": 99.3,
      "viability": 92,
      "minGermination": 85,
      "predictedGermination90d": 88.6,
      "openQualityFlags": 0,
      "riskScore": 3,
      "riskLevel": "low",
      "factors": [
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "d088aad8-5fd2-48e5-9004-76fe71f5c1d0",
      "lotCode": "SL-GEN-BREEDER-01",
      "crop": "Paddy",
      "variety": "Paddy-1010",
      "stage": "Breeder",
      "testingStatus": "testing",
      "quantityAvailable": 10000,
      "unit": "kg",
      "ageDays": 0,
      "germination": 96,
      "purity": 99,
      "viability": 97.5,
      "minGermination": 80,
      "predictedGermination90d": 93.6,
      "openQualityFlags": 0,
      "riskScore": 3,
      "riskLevel": "low",
      "factors": [
        {
          "label": "Lab result pending",
          "points": 3
        }
      ],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "5644326f-c384-42d1-bf5b-0c56c0d97dc0",
      "lotCode": "SL-AI-BJ-801",
      "crop": "Bajra",
      "variety": "MMS Bajra 86",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 3900,
      "unit": "kg",
      "ageDays": 100,
      "germination": 85,
      "purity": 98.5,
      "viability": 86,
      "minGermination": 75,
      "predictedGermination90d": 82.6,
      "openQualityFlags": 0,
      "riskScore": 0,
      "riskLevel": "low",
      "factors": [],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "0096f923-9c86-44b0-8b5f-1b346bdec8c4",
      "lotCode": "SL-AI-PD-401",
      "crop": "Paddy",
      "variety": "MTU 1010",
      "stage": "Certified",
      "testingStatus": "certified",
      "quantityAvailable": 10800,
      "unit": "kg",
      "ageDays": 75,
      "germination": 87,
      "purity": 98.8,
      "viability": 88,
      "minGermination": 80,
      "predictedGermination90d": 84.6,
      "openQualityFlags": 0,
      "riskScore": 0,
      "riskLevel": "low",
      "factors": [],
      "recommendation": "No action needed."
    },
    {
      "seedLotId": "dd9e906d-9798-4efc-8829-dd66cae8850a",
      "lotCode": "SL-AI-SB-302",
      "crop": "Soybean",
      "variety": "JS 20-34",
      "stage": "Foundation",
      "testingStatus": "certified",
      "quantityAvailable": 3000,
      "unit": "kg",
      "ageDays": 30,
      "germination": 89,
      "purity": 99.1,
      "viability": 90,
      "minGermination": 70,
      "predictedGermination90d": 83,
      "openQualityFlags": 0,
      "riskScore": 0,
      "riskLevel": "low",
      "factors": [],
      "recommendation": "No action needed."
    }
  ],
  "narrative": "- 4 critical and 5 high-risk lot(s) out of 19 active lots; 38,600 kg is exposed.\n- SL-AI-MZ-104 (Maize, MMS Hybrid 9090): Germination 79.5% is below the 90% minimum. Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade.\n- SL-AI-MZ-102 (Maize, MMS Hybrid 7711): Germination 84% is below the 90% minimum. Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade.\n- SL-AI-SF-901 (Sunflower, KBSH-44): Germination 72% is within 3 points of the 70% minimum. Submit a sample to the lab before any dispatch.\n- SL-AI-CT-202 (Cotton, Bt Cotton MM-55): Germination 67% is within 3 points of the 65% minimum. Sell first: germination is forecast to fall to about 62.8% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season.\n- SL-AI-PD-402 (Paddy, BPT 5204): Germination 81% is within 3 points of the 80% minimum. Sell first: germination is forecast to fall to about 78.6% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season.\nNext step: put SL-AI-MZ-104 on hold and re-test it this week.",
  "narrativeSource": "rules",
  "model": null
};

export const DEMO_AI_FORECASTS: Omit<AiForecastReport, 'generatedAt'> = {
  "horizonDays": 90,
  "crops": [
    {
      "crop": "Bajra",
      "lots": 1,
      "quantityAvailable": 3900,
      "allocatedLast90d": 2100,
      "monthlyVelocity": 700,
      "monthsOfCover": 5.6,
      "projectedStockoutDate": "2027-03-22",
      "status": "healthy"
    },
    {
      "crop": "Chilli",
      "lots": 1,
      "quantityAvailable": 100,
      "allocatedLast90d": 20,
      "monthlyVelocity": 7,
      "monthsOfCover": 15,
      "projectedStockoutDate": "2027-12-30",
      "status": "slow-moving"
    },
    {
      "crop": "Cotton",
      "lots": 2,
      "quantityAvailable": 5700,
      "allocatedLast90d": 3300,
      "monthlyVelocity": 1100,
      "monthsOfCover": 5.2,
      "projectedStockoutDate": "2027-03-10",
      "status": "healthy"
    },
    {
      "crop": "Maize",
      "lots": 5,
      "quantityAvailable": 25800,
      "allocatedLast90d": 9700,
      "monthlyVelocity": 3233,
      "monthsOfCover": 8,
      "projectedStockoutDate": "2027-06-02",
      "status": "healthy"
    },
    {
      "crop": "Paddy",
      "lots": 4,
      "quantityAvailable": 36000,
      "allocatedLast90d": 10000,
      "monthlyVelocity": 3333,
      "monthsOfCover": 10.8,
      "projectedStockoutDate": "2027-08-26",
      "status": "healthy"
    },
    {
      "crop": "Soybean",
      "lots": 2,
      "quantityAvailable": 9700,
      "allocatedLast90d": 8300,
      "monthlyVelocity": 2767,
      "monthsOfCover": 3.5,
      "projectedStockoutDate": "2027-01-19",
      "status": "healthy"
    },
    {
      "crop": "Sunflower",
      "lots": 1,
      "quantityAvailable": 2800,
      "allocatedLast90d": 0,
      "monthlyVelocity": 0,
      "monthsOfCover": null,
      "projectedStockoutDate": null,
      "status": "slow-moving"
    },
    {
      "crop": "Tomato",
      "lots": 1,
      "quantityAvailable": 35,
      "allocatedLast90d": 145,
      "monthlyVelocity": 48,
      "monthsOfCover": 0.7,
      "projectedStockoutDate": "2026-10-28",
      "status": "shortage"
    },
    {
      "crop": "Wheat",
      "lots": 2,
      "quantityAvailable": 18100,
      "allocatedLast90d": 2400,
      "monthlyVelocity": 800,
      "monthsOfCover": 22.6,
      "projectedStockoutDate": "2028-08-15",
      "status": "slow-moving"
    }
  ],
  "expiring": [
    {
      "seedLotId": "d53c82a5-3c04-40b1-97fe-b3026562e568",
      "lotCode": "SL-AI-PD-402",
      "crop": "Paddy",
      "variety": "BPT 5204",
      "quantityAvailable": 10200,
      "unit": "kg",
      "daysToExpiry": 10,
      "expiryDate": "2026-10-16"
    },
    {
      "seedLotId": "ea8aee1f-8fc8-402c-a705-f1ad99b35771",
      "lotCode": "SL-AI-MZ-104",
      "crop": "Maize",
      "variety": "MMS Hybrid 9090",
      "quantityAvailable": 7100,
      "unit": "kg",
      "daysToExpiry": 20,
      "expiryDate": "2026-10-26"
    },
    {
      "seedLotId": "1eb9f018-211d-4628-8b42-a95138a569b3",
      "lotCode": "SL-AI-SF-901",
      "crop": "Sunflower",
      "variety": "KBSH-44",
      "quantityAvailable": 2800,
      "unit": "kg",
      "daysToExpiry": 25,
      "expiryDate": "2026-10-31"
    },
    {
      "seedLotId": "1a4a4ee2-582c-4baa-b50f-b2c8473c55f8",
      "lotCode": "SL-AI-CT-202",
      "crop": "Cotton",
      "variety": "Bt Cotton MM-55",
      "quantityAvailable": 3500,
      "unit": "kg",
      "daysToExpiry": 40,
      "expiryDate": "2026-11-15"
    },
    {
      "seedLotId": "7771c50c-003a-4898-bd81-af48fbb94acb",
      "lotCode": "SL-AI-MZ-102",
      "crop": "Maize",
      "variety": "MMS Hybrid 7711",
      "quantityAvailable": 6900,
      "unit": "kg",
      "daysToExpiry": 60,
      "expiryDate": "2026-12-05"
    },
    {
      "seedLotId": "2dbe6e9d-9e9c-4d4e-a60c-2f08a9a6edaa",
      "lotCode": "SL-AI-CH-701",
      "crop": "Chilli",
      "variety": "MMS Teja Hybrid",
      "quantityAvailable": 100,
      "unit": "kg",
      "daysToExpiry": 70,
      "expiryDate": "2026-12-15"
    },
    {
      "seedLotId": "6516a13c-22c6-4d54-9499-d9667853267a",
      "lotCode": "SL-AI-WH-502",
      "crop": "Wheat",
      "variety": "GW 322",
      "quantityAvailable": 1600,
      "unit": "kg",
      "daysToExpiry": 90,
      "expiryDate": "2027-01-04"
    }
  ],
  "narrative": "- Stock is short or tight for Tomato (0.7 months of cover) at the last 90 days' dispatch rate.\n- 7 lot(s) holding 32,200 kg reach label validity within 90 days; the first is SL-AI-PD-402 in 10 days.\n- Slow-moving stock: Chilli, Sunflower, Wheat.\nNext step: raise the Tomato production or procurement plan.",
  "narrativeSource": "rules",
  "model": null
};
