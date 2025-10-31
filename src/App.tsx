import React, { useEffect, useMemo, useState } from "react";

type ScreenId = "000" | "055" | "063" | "073" | "122" | "350" | "380" | "910";

type JobStatus = "OPEN" | "IN WORK" | "COMPLETE";

type ScenarioTier = "beginner" | "intermediate" | "advanced";

interface SupplyRequest {
  partNumber: string;
  noun: string;
  quantity: number;
  requestedOn: string;
}

interface JobRecord {
  jcn: string;
  equipmentId: string;
  wuc: string;
  whenDiscovered: string;
  howMalfunction?: string;
  discrepancy: string;
  workCenter: string;
  typeMaintenance: string;
  status: JobStatus;
  createdBy: string;
  discoveryDate: string;
  scheduledDate?: string;
  actionTaken?: string;
  correctiveAction?: string;
  manhours?: number;
  completedOn?: string;
  supplyRequests?: SupplyRequest[];
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  timeEstimate: string;
  startScreen: ScreenId;
  requiredFields?: Record<string, string>;
  workflow?: ScreenId[];
  dependsOn?: string;
  hints?: string[];
  successCriteria: string;
}

const WUC_CATALOG = [
  { code: "01100", desc: "Fuselage - General" },
  { code: "02100", desc: "Cockpit/Cabin/Crew Station" },
  { code: "11210", desc: "Main Rotor System" },
  { code: "12110", desc: "Tail Rotor System" },
  { code: "13110", desc: "Transmission - Main" },
  { code: "14110", desc: "Engine No. 1" },
  { code: "15110", desc: "Engine No. 2" },
  { code: "15220", desc: "Aux Power Unit" },
  { code: "24230", desc: "Flight Controls - Primary" },
  { code: "27110", desc: "Flight Controls - Auto Pilot" },
  { code: "32110", desc: "Hydraulic System - Primary" },
  { code: "42100", desc: "Electrical Power Supply" },
  { code: "45100", desc: "Central Maintenance Computer" },
  { code: "46100", desc: "Fire Detection/Suppression" },
  { code: "51100", desc: "Instruments - Flight" },
  { code: "55100", desc: "Malfunction Analysis Recording" },
  { code: "63100", desc: "VHF Communications" },
  { code: "65100", desc: "IFF/Transponder" },
  { code: "72100", desc: "Engine Instrument System" },
  { code: "91100", desc: "Emergency Equipment" },
  { code: "99NOC", desc: "Not Otherwise Classified" }
];

const WORK_CENTERS = ["JFLTL", "JFENG", "JFAVS", "JFELC", "JFSHP", "JFHYD"];
const EQUIPMENT_IDS = ["A1001", "A1002", "A1003", "A1004", "A1005", "A2001", "A2002", "A2003"];

const WHEN_DISCOVERED_CODES: Record<string, string> = {
  A: "Acceptance Inspection",
  B: "Flying/Operational Check",
  C: "Scheduled/Special Inspection",
  F: "Functional Check Flight",
  G: "Ground Abort",
  M: "In-Flight",
  O: "Ground Operations"
};

const HOW_MALFUNCTION_CODES: Record<string, string> = {
  A: "Structural Failure/Damage",
  B: "Burned/Fire Damage",
  C: "Corroded",
  E: "Excessive Wear/Play",
  F: "Failed to Operate",
  G: "Gave Incorrect Information",
  H: "Hydraulic Leak",
  J: "Jammed",
  K: "Cracked",
  L: "Loosened",
  M: "Missing/Lost",
  N: "Not Properly Adjusted/Rigged",
  O: "Omitted/Not Performed",
  P: "Pneumatic Leak",
  R: "Ruptured",
  S: "Shorted",
  T: "Bent/Twisted/Out of Alignment",
  U: "Unknown",
  W: "Worn",
  X: "Broken",
  Z: "Other (Explain in Discrepancy)"
};

const ACTION_TAKEN_CODES: Record<string, string> = {
  A: "Adjusted/Aligned",
  B: "Repaired by Brazing/Welding/Gluing",
  C: "Cleaned/Preserved/Painted",
  D: "Performed Operational Check - Satisfactory",
  E: "Examined - No Defect Found",
  F: "Fabricated",
  G: "Serviced - Lubricated/Refueled/Recharged",
  I: "Installed",
  K: "Checked - Found OK",
  L: "Sealed/Locked/Safetied",
  M: "Transferred/Released For Shipment",
  N: "No Defect Found (After Extensive Testing)",
  O: "Reinstalled",
  P: "Replaced",
  R: "Removed",
  S: "Straightened",
  T: "Tightened/Torqued",
  U: "Flushed/Purged",
  V: "Inspected IAW T.O.",
  X: "Removed and Reinstalled",
  Y: "Inspected - Found Unsatisfactory",
  Z: "Other (Explain in Corrective Action)"
};

const TYPE_MAINTENANCE_CODES: Record<string, string> = {
  S: "Scheduled",
  U: "Unscheduled",
  C: "Conditional"
};

const SCENARIOS: Record<ScenarioTier, Scenario[]> = {
  beginner: [
    {
      id: "B1",
      name: "Basic Scheduled Inspection",
      description: "Create a 100-hour inspection for Aircraft A1001",
      difficulty: "Beginner",
      timeEstimate: "5-10 minutes",
      startScreen: "073",
      requiredFields: {
        equipmentId: "A1001",
        wuc: "11210",
        typeMaintenance: "S",
        whenDiscovered: "C",
        workCenter: "JFLTL",
        discrepancy: "100 Hour Inspection Due"
      },
      hints: [
        "Use work center JFLTL for flight line",
        "WUC 11210 is Main Rotor System",
        "Type Maintenance 'S' = Scheduled",
        "When Discovered 'C' = Scheduled/Special Inspection"
      ],
      successCriteria: "JCN successfully created with all required fields"
    },
    {
      id: "B2",
      name: "View Maintenance Snapshot",
      description: "Look up the job you just created using Screen 122",
      difficulty: "Beginner",
      timeEstimate: "2-3 minutes",
      startScreen: "122",
      dependsOn: "B1",
      hints: [
        "You can search by JCN or Equipment ID",
        "The JCN was generated in the previous scenario",
        "Equipment ID format is A####"
      ],
      successCriteria: "Successfully viewed job details"
    }
  ],
  intermediate: [
    {
      id: "I1",
      name: "Emergency Engine Repair",
      description: "Document an engine malfunction discovered during preflight",
      difficulty: "Intermediate",
      timeEstimate: "10-15 minutes",
      startScreen: "073",
      requiredFields: {
        equipmentId: "A1002",
        wuc: "14110",
        typeMaintenance: "U",
        whenDiscovered: "B",
        howMalfunction: "F",
        workCenter: "JFENG",
        discrepancy: "Engine No. 1 failed to start during preflight ops check"
      },
      hints: [
        "Unscheduled maintenance = 'U'",
        "Engine work center is JFENG",
        "WUC 14110 = Engine No. 1",
        "How Malfunction 'F' = Failed to Operate"
      ],
      successCriteria: "Job created with proper priority and all technical details"
    },
    {
      id: "I2",
      name: "Complete Repair Workflow",
      description: "Create job, request parts, and close out when complete",
      difficulty: "Intermediate",
      timeEstimate: "15-20 minutes",
      startScreen: "073",
      workflow: ["073", "063", "350"],
      hints: [
        "Start by creating the job in Screen 073",
        "Then use Screen 063 to request parts",
        "Finally close the job in Screen 350 with action taken"
      ],
      successCriteria: "Complete workflow from creation to closure"
    }
  ],
  advanced: [
    {
      id: "A1",
      name: "Complex Deferred Maintenance",
      description: "Document a non-critical hydraulic leak that will be deferred",
      difficulty: "Advanced",
      timeEstimate: "15-20 minutes",
      startScreen: "073",
      requiredFields: {
        equipmentId: "A1003",
        wuc: "32110",
        typeMaintenance: "U",
        whenDiscovered: "O",
        howMalfunction: "H",
        workCenter: "JFHYD",
        discrepancy:
          "Slow hydraulic leak observed at fitting 32-A during ground ops. Rate approx 1 drop per 30 sec. System pressure stable."
      },
      hints: [
        "Detailed discrepancies are critical for deferred items",
        "Include leak rate and location specifics",
        "Note that system is still operational",
        "Reference T.O. procedures if applicable"
      ],
      successCriteria: "Job documented with sufficient detail for engineering review"
    }
  ]
};

const colors = {
  shellBg: "#0b1b2a",
  shellText: "#cde4ff",
  statusBg: "#1f2937",
  statusText: "#f59e0b",
  panel: "#E8E4D0",
  border: "#9CA3AF"
};

const statusColor = (status: JobStatus) => {
  switch (status) {
    case "OPEN":
      return "#b45309";
    case "IN WORK":
      return "#2563eb";
    case "COMPLETE":
    default:
      return "#16a34a";
  }
};

const StyleInjector = () => (
  <style>{`
    body { margin:0; background:#0f172a; }
    .btn { background:#1f2937; color:#e5e7eb; border:0; padding:8px 12px; cursor:pointer; font-weight:700; transition:filter 0.2s ease; }
    .btn:hover { filter:brightness(1.1); }
    .btn:disabled { opacity:0.55; cursor:not-allowed; }
    .field { width:100%; padding:8px; border:1px solid #9CA3AF; background:#fff; border-radius:4px; }
    .grid { display:grid; gap:8px; }
  `}</style>
);

interface ScreenShellProps {
  scr: ScreenId;
  title: string;
  children: React.ReactNode;
  onXmit?: () => void;
  onClear?: () => void;
  onExit?: () => void;
  help?: string;
  tutorialMode?: boolean;
}

const ScreenShell: React.FC<ScreenShellProps> = ({
  scr,
  title,
  children,
  onXmit,
  onClear,
  onExit,
  help,
  tutorialMode
}) => {
  return (
    <div style={{ minHeight: "100vh", background: "#111827" }}>
      <div
        style={{
          background: colors.shellBg,
          color: colors.shellText,
          padding: "10px 16px",
          fontFamily: "monospace"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>INTEGRATED MAINTENANCE DATA SYSTEM (IMDS)</div>
          <div>
            SCR: <span style={{ fontWeight: 900 }}>{scr}</span>
          </div>
        </div>
        <div style={{ marginTop: 6, color: "#9cc4ff", fontWeight: 700 }}>{title}</div>
      </div>

      <div style={{ padding: 16 }}>
        {help && tutorialMode ? (
          <div style={{ background: "#DBEAFE", border: "2px solid #93C5FD", padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>HELP</div>
            <div style={{ fontSize: 12 }}>{help}</div>
          </div>
        ) : null}
        <div style={{ background: colors.panel, border: `2px solid ${colors.border}`, padding: 16, borderRadius: 8 }}>{children}</div>
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: colors.statusBg,
          color: colors.statusText,
          padding: "8px 16px",
          fontFamily: "monospace",
          display: "flex",
          gap: 16
        }}
      >
        <div>F1 HELP</div>
        <div style={{ color: "#9CA3AF" }}>|</div>
        <button onClick={onExit} className="btn">F3 EXIT</button>
        <div style={{ color: "#9CA3AF" }}>|</div>
        <button onClick={onClear} className="btn">F7 CLEAR</button>
        <div style={{ color: "#9CA3AF" }}>|</div>
        <button onClick={onXmit} className="btn">F9 XMIT</button>
      </div>
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode; req?: boolean }> = ({ children, req }) => (
  <span style={{ fontWeight: 800 }}>
    {children} {req ? <span style={{ color: "#b91c1c" }}>*</span> : null}
  </span>
);

const Err: React.FC<{ msg?: string }> = ({ msg }) => {
  if (!msg) return null;
  return <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{msg}</div>;
};

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div style={{ border: `2px solid ${colors.border}`, background: "#FFFFFF", padding: 8, textAlign: "center", borderRadius: 6 }}>
    <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
    <div style={{ fontSize: 12 }}>{label}</div>
  </div>
);

const Group: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div style={{ border: `2px solid ${colors.border}`, background: "#FFFDF6", padding: 12, borderRadius: 6 }}>
    <div style={{ fontWeight: 900, marginBottom: 8, color }}>{title}</div>
    <div className="grid">{children}</div>
  </div>
);

interface ScenarioCardProps {
  scenario: Scenario;
  completed: boolean;
  locked: boolean;
  onStart: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, completed, locked, onStart }) => (
  <div style={{ border: `2px solid ${colors.border}`, background: "#FFFFFF", padding: 12, borderRadius: 6, opacity: locked ? 0.65 : 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontWeight: 800 }}>{scenario.name}</div>
        <div style={{ fontSize: 12, color: "#4b5563" }}>{scenario.description}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          ⏱ {scenario.timeEstimate} • Screen {scenario.startScreen}
        </div>
      </div>
      {completed ? <div style={{ color: "#16A34A", fontWeight: 900 }}>✓ COMPLETE</div> : null}
    </div>
    <div style={{ marginTop: 8 }}>
      <button className="btn" onClick={onStart} disabled={locked}>
        {locked ? "LOCKED" : completed ? "REVIEW" : "START"}
      </button>
    </div>
  </div>
);

const totalScenarioCount = Object.values(SCENARIOS).reduce((acc, arr) => acc + arr.length, 0);

const generateJCN = () => {
  const year = String(new Date().getFullYear()).slice(-2);
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `${year}A${random}`;
};

const getJulianDate = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const day = Math.floor(diff);
  return `${String(date.getFullYear()).slice(-2)}${String(day).padStart(3, "0")}`;
};

const parseJulianDate = (julian?: string) => {
  if (!julian || !/^\d{5}$/.test(julian)) return null;
  const year = 2000 + parseInt(julian.substring(0, 2), 10);
  const dayOfYear = parseInt(julian.substring(2, 5), 10);
  if (dayOfYear < 1 || dayOfYear > 366) return null;
  const date = new Date(year, 0);
  date.setDate(dayOfYear);
  return date;
};

const scenarioById: Record<string, Scenario> = Object.values(SCENARIOS)
  .flat()
  .reduce((acc, scenario) => {
    acc[scenario.id] = scenario;
    return acc;
  }, {} as Record<string, Scenario>);

const IMDSTrainer: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("000");
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tutorialMode, setTutorialMode] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
  const [workflowProgress, setWorkflowProgress] = useState<Record<string, number>>({});
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshotData, setSnapshotData] = useState<JobRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const jcn = generateJCN();
    console.assert(/^\d{2}A\d{5}$/.test(jcn), "JCN format invalid", jcn);
    const jd = getJulianDate();
    console.assert(/^\d{5}$/.test(jd), "Julian format invalid", jd);
    const parsed = parseJulianDate(jd);
    console.assert(parsed instanceof Date, "Julian parse failed", parsed);
    console.assert(parseJulianDate("9910x") === null, "Invalid julian did not return null");
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const statistics = useMemo(() => {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter((job) => job.status === "OPEN").length;
    const inWorkJobs = jobs.filter((job) => job.status === "IN WORK").length;
    const completedJobs = jobs.filter((job) => job.status === "COMPLETE").length;
    const scenariosCompleted = completedScenarios.length;
    const averageScore = totalScenarioCount === 0 ? 0 : Math.round((scenariosCompleted / totalScenarioCount) * 100);
    return { totalJobs, openJobs, inWorkJobs, completedJobs, scenariosCompleted, averageScore };
  }, [jobs, completedScenarios]);

  const resetForm = () => {
    setFormData({});
    setErrors({});
    setShowSnapshot(false);
    setSnapshotData(null);
  };

  const validateForm = (screen: ScreenId, data: Record<string, any>) => {
    const validationErrors: Record<string, string> = {};
    switch (screen) {
      case "073":
        if (!data.equipmentId) validationErrors.equipmentId = "Equipment ID required";
        if (!data.wuc) validationErrors.wuc = "WUC required";
        if (!data.whenDiscovered) validationErrors.whenDiscovered = "When Discovered required";
        if (!data.discrepancy || data.discrepancy.trim().length < 10)
          validationErrors.discrepancy = "Discrepancy must be at least 10 characters";
        if (!data.workCenter) validationErrors.workCenter = "Work Center required";
        if (!data.typeMaintenance) validationErrors.typeMaintenance = "Type Maintenance required";
        if (data.scheduledDate) {
          const schedDate = parseJulianDate(data.scheduledDate);
          if (!schedDate) validationErrors.scheduledDate = "Invalid YYDDD";
          else if (schedDate < new Date()) validationErrors.scheduledDate = "Cannot schedule in the past";
        }
        break;
      case "122":
        if (!data.jcn && !data.equipmentId) {
          validationErrors.jcn = "Either JCN or Equipment ID required";
          validationErrors.equipmentId = "Either JCN or Equipment ID required";
        }
        break;
      case "350":
        if (!data.jcn) validationErrors.jcn = "JCN required";
        if (!data.actionTaken) validationErrors.actionTaken = "Action Taken required";
        if (!data.correctiveAction || data.correctiveAction.trim().length < 10)
          validationErrors.correctiveAction = "Corrective Action must be at least 10 characters";
        if (!data.manhours || Number(data.manhours) < 0.1)
          validationErrors.manhours = "Manhours must be at least 0.1";
        break;
      case "063":
        if (!data.jcn) validationErrors.jcn = "JCN required";
        if (!data.partNumber) validationErrors.partNumber = "Part Number required";
        if (!data.noun) validationErrors.noun = "Noun required";
        if (!data.quantity || Number(data.quantity) < 1) validationErrors.quantity = "Quantity must be at least 1";
        break;
      default:
        break;
    }
    return validationErrors;
  };

  const markScenarioProgress = (screen: ScreenId, payload?: { job?: JobRecord }) => {
    if (!currentScenario) return;

    if (currentScenario.requiredFields && screen === currentScenario.startScreen) {
      const matches = Object.entries(currentScenario.requiredFields).every(([key, value]) => {
        if (key === "discrepancy") {
          return typeof formData.discrepancy === "string" && formData.discrepancy.includes(value);
        }
        return formData[key]?.toString().toUpperCase() === value.toUpperCase();
      });
      if (matches) {
        completeScenario();
        return;
      }
    }

    if (currentScenario.workflow) {
      const currentIndex = workflowProgress[currentScenario.id] ?? 0;
      if (currentScenario.workflow[currentIndex] === screen) {
        const nextIndex = currentIndex + 1;
        setWorkflowProgress((prev) => ({ ...prev, [currentScenario.id]: nextIndex }));
        if (nextIndex >= currentScenario.workflow.length) {
          completeScenario();
        } else if (screen === "073" && payload?.job) {
          setFormData((prev) => ({ ...prev, jcn: payload.job?.jcn }));
        }
      }
    }

    if (currentScenario.id === "B2" && screen === "122" && showSnapshot) {
      completeScenario();
    }
  };

  const completeScenario = () => {
    if (!currentScenario) return;
    setCompletedScenarios((prev) => (prev.includes(currentScenario.id) ? prev : [...prev, currentScenario.id]));
    setMessage(`Scenario "${currentScenario.name}" completed!`);
    setWorkflowProgress((prev) => {
      const { [currentScenario.id]: _removed, ...rest } = prev;
      return rest;
    });
    setCurrentScenario(null);
  };

  const handleSubmit = (screen: ScreenId) => {
    const validationErrors = validateForm(screen, formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    switch (screen) {
      case "073": {
        const jcn = generateJCN();
        const newJob: JobRecord = {
          jcn,
          equipmentId: formData.equipmentId,
          wuc: formData.wuc,
          whenDiscovered: formData.whenDiscovered,
          howMalfunction: formData.howMalfunction || "",
          discrepancy: formData.discrepancy.trim(),
          workCenter: formData.workCenter,
          typeMaintenance: formData.typeMaintenance,
          status: "OPEN",
          createdBy: assessmentMode ? "STUDENT" : "TRAINER",
          discoveryDate: getJulianDate(),
          scheduledDate: formData.scheduledDate || undefined,
          supplyRequests: []
        };

        setJobs((prev) => [...prev, newJob]);
        setMessage(`Job ${jcn} created for ${newJob.equipmentId}.`);
        setFormData({});
        setErrors({});
        markScenarioProgress(screen, { job: newJob });
        break;
      }
      case "122": {
        const query = formData.jcn?.trim().toUpperCase();
        const eqId = formData.equipmentId?.trim().toUpperCase();
        const job = jobs.find((j) => (query ? j.jcn === query : j.equipmentId === eqId));
        if (job) {
          setSnapshotData(job);
          setShowSnapshot(true);
          setMessage(`Report generated for JCN ${job.jcn}.`);
          markScenarioProgress(screen);
        } else {
          setShowSnapshot(false);
          setSnapshotData(null);
          setMessage("No job found for provided criteria.");
        }
        break;
      }
      case "350": {
        const jcn = formData.jcn;
        const job = jobs.find((j) => j.jcn === jcn);
        if (!job) {
          setMessage("JCN not found.");
          return;
        }
        const updatedJob: JobRecord = {
          ...job,
          status: "COMPLETE",
          actionTaken: formData.actionTaken,
          correctiveAction: formData.correctiveAction.trim(),
          manhours: Number(formData.manhours),
          completedOn: getJulianDate()
        };
        setJobs((prev) => prev.map((j) => (j.jcn === jcn ? updatedJob : j)));
        setMessage(`Job ${jcn} closed out.`);
        setFormData({});
        setErrors({});
        markScenarioProgress(screen);
        break;
      }
      case "063": {
        const jcn = formData.jcn;
        const job = jobs.find((j) => j.jcn === jcn);
        if (!job) {
          setMessage("JCN not found.");
          return;
        }
        const request: SupplyRequest = {
          partNumber: formData.partNumber,
          noun: formData.noun,
          quantity: Number(formData.quantity),
          requestedOn: getJulianDate()
        };
        setJobs((prev) =>
          prev.map((j) =>
            j.jcn === jcn
              ? {
                  ...j,
                  status: j.status === "OPEN" ? "IN WORK" : j.status,
                  supplyRequests: [...(j.supplyRequests ?? []), request]
                }
              : j
          )
        );
        setMessage(`Supply request submitted for JCN ${jcn}.`);
        setFormData({});
        setErrors({});
        markScenarioProgress(screen);
        break;
      }
      default:
        break;
    }
  };

  const autoFill = (screen: ScreenId) => {
    switch (screen) {
      case "073":
        setFormData({
          equipmentId: "A1001",
          wuc: "11210",
          whenDiscovered: "C",
          howMalfunction: "E",
          discrepancy: "Excessive vibration in main rotor system during ground run",
          workCenter: "JFLTL",
          typeMaintenance: "U"
        });
        break;
      case "122":
        setFormData({ jcn: jobs[jobs.length - 1]?.jcn ?? "", equipmentId: "A1001" });
        break;
      case "350":
        setFormData({
          jcn: jobs.find((j) => j.status !== "COMPLETE")?.jcn ?? "",
          actionTaken: "A",
          correctiveAction: "Adjusted main rotor tracking per T.O. 1H-60(C)W-3. Ground run satisfactory.",
          manhours: "2.5"
        });
        break;
      case "063":
        setFormData({
          jcn: jobs.find((j) => j.status !== "COMPLETE")?.jcn ?? "",
          partNumber: "70351-06102-041",
          noun: "BLADE, MAIN ROTOR",
          quantity: "1"
        });
        break;
      default:
        break;
    }
  };

  const Menu000 = () => (
    <div style={{ padding: 16, color: "#111" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#e5e7eb" }}>HH-60W IMDS TRAINER</h1>
        <div style={{ color: "#cbd5f5" }}>Integrated Maintenance Data System Training Environment</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#DBEAFE", border: "2px solid #93C5FD", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📚 Training Screens</div>
          <div className="grid">
            <button className="btn" onClick={() => { setCurrentScreen("073"); resetForm(); }}>073 - Schedule Maintenance</button>
            <button className="btn" onClick={() => { setCurrentScreen("122"); resetForm(); }}>122 - Maintenance Snapshot</button>
            <button className="btn" onClick={() => { setCurrentScreen("350"); resetForm(); }}>350 - Close Job</button>
            <button className="btn" onClick={() => { setCurrentScreen("063"); resetForm(); }}>063 - Supply Request</button>
            <button className="btn" onClick={() => { setCurrentScreen("380"); resetForm(); }}>380 - Document Maintenance List</button>
            <button className="btn" onClick={() => { setCurrentScreen("055"); resetForm(); }}>055 - Equipment Status</button>
          </div>
        </div>
        <div style={{ background: "#DCFCE7", border: "2px solid #86EFAC", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>🎯 Practice Scenarios</div>
          <button className="btn" onClick={() => { setCurrentScreen("910"); resetForm(); }}>Start Practice Scenarios</button>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 8 }}>• Beginner (2) • Intermediate (2) • Advanced (1)</div>
        </div>
      </div>

      <div style={{ background: "#F3F4F6", border: `2px solid ${colors.border}`, padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>📊 Statistics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <Stat label="Total Jobs" value={statistics.totalJobs} />
          <Stat label="Open Jobs" value={statistics.openJobs} />
          <Stat label="In Work" value={statistics.inWorkJobs} />
          <Stat label="Completed" value={statistics.completedJobs} />
          <Stat label="Scenarios Done" value={`${statistics.scenariosCompleted}/${totalScenarioCount}`} />
          <Stat label="Scenario Score" value={`${statistics.averageScore}%`} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 12 }}>
        <button
          className="btn"
          onClick={() => {
            setTutorialMode((prev) => !prev);
            if (!tutorialMode) setAssessmentMode(false);
          }}
        >
          {tutorialMode ? "✓ Tutorial Mode ON" : "Tutorial Mode OFF"}
        </button>
        <button
          className="btn"
          onClick={() => {
            setAssessmentMode((prev) => !prev);
            if (!assessmentMode) setTutorialMode(false);
          }}
        >
          {assessmentMode ? "✓ Assessment Mode ON" : "Assessment Mode OFF"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 8 }}>
        <button
          className="btn"
          onClick={() => {
            const dataStr = JSON.stringify({ jobs, statistics, completedScenarios }, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "imds_training_data.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          💾 Export Training Data
        </button>
        <button
          className="btn"
          onClick={() => {
            if (window.confirm("Reset all training data? This cannot be undone.")) {
              setJobs([]);
              setCompletedScenarios([]);
              setWorkflowProgress({});
              resetForm();
              setMessage("Training data reset.");
            }
          }}
        >
          🔄 Reset All Data
        </button>
      </div>

      {currentScenario ? (
        <div style={{ marginTop: 16, background: "#FEF3C7", border: "2px solid #F59E0B", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 900 }}>Active Scenario: {currentScenario.name}</div>
          <div style={{ fontSize: 12 }}>{currentScenario.successCriteria}</div>
        </div>
      ) : null}
    </div>
  );

  const Screen073 = () => (
    <ScreenShell
      scr="073"
      title="SCHEDULE MAINTENANCE"
      tutorialMode={tutorialMode}
      help="Create new maintenance jobs. Fill all required (*) fields."
      onExit={() => setCurrentScreen("000")}
      onClear={() => resetForm()}
      onXmit={() => handleSubmit("073")}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label req>Equipment ID</Label>
          <select
            value={formData.equipmentId ?? ""}
            onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {EQUIPMENT_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <Err msg={errors.equipmentId} />
        </div>
        <div>
          <Label req>Work Unit Code (WUC)</Label>
          <select
            value={formData.wuc ?? ""}
            onChange={(e) => setFormData({ ...formData, wuc: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {WUC_CATALOG.map((wuc) => (
              <option key={wuc.code} value={wuc.code}>
                {wuc.code} - {wuc.desc}
              </option>
            ))}
          </select>
          <Err msg={errors.wuc} />
        </div>
        <div>
          <Label req>When Discovered</Label>
          <select
            value={formData.whenDiscovered ?? ""}
            onChange={(e) => setFormData({ ...formData, whenDiscovered: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {Object.entries(WHEN_DISCOVERED_CODES).map(([code, desc]) => (
              <option key={code} value={code}>
                {code} - {desc}
              </option>
            ))}
          </select>
          <Err msg={errors.whenDiscovered} />
        </div>
        <div>
          <Label>How Malfunction</Label>
          <select
            value={formData.howMalfunction ?? ""}
            onChange={(e) => setFormData({ ...formData, howMalfunction: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {Object.entries(HOW_MALFUNCTION_CODES).map(([code, desc]) => (
              <option key={code} value={code}>
                {code} - {desc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label req>Type Maintenance</Label>
          <select
            value={formData.typeMaintenance ?? ""}
            onChange={(e) => setFormData({ ...formData, typeMaintenance: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {Object.entries(TYPE_MAINTENANCE_CODES).map(([code, desc]) => (
              <option key={code} value={code}>
                {code} - {desc}
              </option>
            ))}
          </select>
          <Err msg={errors.typeMaintenance} />
        </div>
        <div>
          <Label req>Work Center</Label>
          <select
            value={formData.workCenter ?? ""}
            onChange={(e) => setFormData({ ...formData, workCenter: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {WORK_CENTERS.map((wc) => (
              <option key={wc} value={wc}>
                {wc}
              </option>
            ))}
          </select>
          <Err msg={errors.workCenter} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Label req>Discrepancy</Label>
        <textarea
          rows={3}
          value={formData.discrepancy ?? ""}
          onChange={(e) => setFormData({ ...formData, discrepancy: e.target.value })}
          className="field"
          placeholder="Detailed description..."
        />
        <Err msg={errors.discrepancy} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <Label>Discovery Date (Julian)</Label>
          <input type="text" value={getJulianDate()} disabled className="field" />
        </div>
        <div>
          <Label>Scheduled Date (Julian)</Label>
          <input
            type="text"
            value={formData.scheduledDate ?? ""}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            placeholder="YYDDD"
            maxLength={5}
            className="field"
          />
          <Err msg={errors.scheduledDate} />
        </div>
      </div>
      {tutorialMode ? (
        <div style={{ background: "#FEF3C7", border: "2px solid #FDE68A", padding: 12, marginTop: 12, borderRadius: 6 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Tips</div>
          <div style={{ fontSize: 12 }}>
            Equipment: A#### • WUC identifies system • Discrepancy detailed • Julian YYDDD • JCN auto-generated
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => autoFill("073")}>
            Auto-Fill Example
          </button>
        </div>
      ) : null}
    </ScreenShell>
  );

  const Screen122 = () => (
    <ScreenShell
      scr="122"
      title="MAINTENANCE SNAPSHOT"
      tutorialMode={tutorialMode}
      help="Enter either JCN or Equipment ID to view job details."
      onExit={() => setCurrentScreen("000")}
      onClear={() => resetForm()}
      onXmit={() => handleSubmit("122")}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label>Job Control Number (JCN)</Label>
          <input
            type="text"
            value={formData.jcn ?? ""}
            onChange={(e) => setFormData({ ...formData, jcn: e.target.value.toUpperCase() })}
            placeholder="25A12345"
            maxLength={8}
            className="field"
          />
          <Err msg={errors.jcn} />
        </div>
        <div>
          <Label>Equipment ID</Label>
          <input
            type="text"
            value={formData.equipmentId ?? ""}
            onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value.toUpperCase() })}
            placeholder="A1001"
            className="field"
          />
          <Err msg={errors.equipmentId} />
        </div>
      </div>
      {showSnapshot && snapshotData ? (
        <div style={{ background: "#FEF3C7", border: "2px solid #F59E0B", padding: 12, marginTop: 12, borderRadius: 6 }}>
          <div style={{ fontWeight: 900, textAlign: "center", marginBottom: 8 }}>MAINTENANCE SNAPSHOT REPORT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div>
              <b>JCN:</b> {snapshotData.jcn}
            </div>
            <div>
              <b>Equipment ID:</b> {snapshotData.equipmentId}
            </div>
            <div>
              <b>WUC:</b> {snapshotData.wuc}
            </div>
            <div>
              <b>Work Center:</b> {snapshotData.workCenter}
            </div>
            <div>
              <b>Status:</b>{" "}
              <span style={{ fontWeight: 800, color: statusColor(snapshotData.status) }}>{snapshotData.status}</span>
            </div>
            <div>
              <b>Type Maintenance:</b> {snapshotData.typeMaintenance} - {TYPE_MAINTENANCE_CODES[snapshotData.typeMaintenance]}
            </div>
            <div>
              <b>When Discovered:</b> {snapshotData.whenDiscovered} - {WHEN_DISCOVERED_CODES[snapshotData.whenDiscovered]}
            </div>
            {snapshotData.howMalfunction ? (
              <div>
                <b>How Malfunction:</b> {snapshotData.howMalfunction} - {HOW_MALFUNCTION_CODES[snapshotData.howMalfunction]}
              </div>
            ) : null}
            <div style={{ gridColumn: "1/3" }}>
              <b>Discrepancy:</b>
              <div style={{ background: "#fff", border: `1px solid ${colors.border}`, padding: 8, marginTop: 4 }}>
                {snapshotData.discrepancy}
              </div>
            </div>
            {snapshotData.correctiveAction ? (
              <>
                <div>
                  <b>Action Taken:</b> {snapshotData.actionTaken} - {ACTION_TAKEN_CODES[snapshotData.actionTaken ?? ""]}
                </div>
                <div style={{ gridColumn: "1/3" }}>
                  <b>Corrective Action:</b>
                  <div style={{ background: "#fff", border: `1px solid ${colors.border}`, padding: 8, marginTop: 4 }}>
                    {snapshotData.correctiveAction}
                  </div>
                </div>
                <div>
                  <b>Manhours:</b> {snapshotData.manhours?.toFixed(1)}
                </div>
              </>
            ) : null}
            <div>
              <b>Created By:</b> {snapshotData.createdBy}
            </div>
            <div>
              <b>Discovery Date:</b> {snapshotData.discoveryDate}
            </div>
            {snapshotData.completedOn ? (
              <div>
                <b>Completed On:</b> {snapshotData.completedOn}
              </div>
            ) : null}
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => setShowSnapshot(false)}>
              Close Report
            </button>
          </div>
        </div>
      ) : null}
      {tutorialMode ? (
        <div style={{ background: "#FEF3C7", border: "2px solid #FDE68A", padding: 12, marginTop: 12, borderRadius: 6 }}>
          <button className="btn" onClick={() => autoFill("122")}>Auto-Fill Example</button>
        </div>
      ) : null}
    </ScreenShell>
  );

  const Screen350 = () => (
    <ScreenShell
      scr="350"
      title="CLOSE JOB"
      tutorialMode={tutorialMode}
      help="Close out a completed job by documenting corrective action taken."
      onExit={() => setCurrentScreen("000")}
      onClear={() => resetForm()}
      onXmit={() => handleSubmit("350")}
    >
      <div>
        <div>
          <Label req>Job Control Number (JCN)</Label>
          <select
            value={formData.jcn ?? ""}
            onChange={(e) => setFormData({ ...formData, jcn: e.target.value })}
            className="field"
          >
            <option value="">Select Job...</option>
            {jobs
              .filter((job) => job.status !== "COMPLETE")
              .map((job) => (
                <option key={job.jcn} value={job.jcn}>
                  {job.jcn} - {job.equipmentId} - {job.discrepancy.substring(0, 40)}...
                </option>
              ))}
          </select>
          <Err msg={errors.jcn} />
        </div>
        <div>
          <Label req>Action Taken Code</Label>
          <select
            value={formData.actionTaken ?? ""}
            onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {Object.entries(ACTION_TAKEN_CODES).map(([code, desc]) => (
              <option key={code} value={code}>
                {code} - {desc}
              </option>
            ))}
          </select>
          <Err msg={errors.actionTaken} />
        </div>
        <div>
          <Label req>Corrective Action</Label>
          <textarea
            rows={4}
            value={formData.correctiveAction ?? ""}
            onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
            className="field"
            placeholder="Detailed description of work performed, parts replaced, T.O. references, etc."
          />
          <Err msg={errors.correctiveAction} />
        </div>
        <div>
          <Label req>Total Manhours</Label>
          <input
            type="number"
            step={0.1}
            value={formData.manhours ?? ""}
            onChange={(e) => setFormData({ ...formData, manhours: e.target.value })}
            className="field"
            placeholder="0.0"
          />
          <Err msg={errors.manhours} />
        </div>
        {tutorialMode ? (
          <div style={{ background: "#FEF3C7", border: "2px solid #FDE68A", padding: 12, marginTop: 12, borderRadius: 6 }}>
            <button className="btn" onClick={() => autoFill("350")}>Auto-Fill Example</button>
          </div>
        ) : null}
      </div>
    </ScreenShell>
  );

  const Screen063 = () => (
    <ScreenShell
      scr="063"
      title="SUPPLY REQUEST"
      tutorialMode={tutorialMode}
      help="Request parts needed for a maintenance job."
      onExit={() => setCurrentScreen("000")}
      onClear={() => resetForm()}
      onXmit={() => handleSubmit("063")}
    >
      <div>
        <div>
          <Label req>Job Control Number (JCN)</Label>
          <select
            value={formData.jcn ?? ""}
            onChange={(e) => setFormData({ ...formData, jcn: e.target.value })}
            className="field"
          >
            <option value="">Select Job...</option>
            {jobs.map((job) => (
              <option key={job.jcn} value={job.jcn}>
                {job.jcn} - {job.equipmentId} ({job.status})
              </option>
            ))}
          </select>
          <Err msg={errors.jcn} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Label req>Part Number</Label>
            <input
              type="text"
              value={formData.partNumber ?? ""}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
              className="field"
              placeholder="70351-06102-041"
            />
            <Err msg={errors.partNumber} />
          </div>
          <div>
            <Label req>Quantity</Label>
            <input
              type="number"
              value={formData.quantity ?? ""}
              min={1}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="field"
            />
            <Err msg={errors.quantity} />
          </div>
        </div>
        <div>
          <Label req>Noun</Label>
          <input
            type="text"
            value={formData.noun ?? ""}
            onChange={(e) => setFormData({ ...formData, noun: e.target.value.toUpperCase() })}
            className="field"
            placeholder="BLADE, MAIN ROTOR"
          />
          <Err msg={errors.noun} />
        </div>
        {tutorialMode ? (
          <div style={{ background: "#FEF3C7", border: "2px solid #FDE68A", padding: 12, marginTop: 12, borderRadius: 6 }}>
            <button className="btn" onClick={() => autoFill("063")}>Auto-Fill Example</button>
          </div>
        ) : null}
      </div>
    </ScreenShell>
  );

  const Screen380 = () => (
    <ScreenShell
      scr="380"
      title="DOCUMENT MAINTENANCE LIST"
      tutorialMode={tutorialMode}
      onExit={() => setCurrentScreen("000")}
      onClear={() => resetForm()}
      onXmit={() => undefined}
    >
      {jobs.length === 0 ? (
        <p style={{ textAlign: "center", color: "#4b5563" }}>No jobs found. Create a job using Screen 073.</p>
      ) : (
        <div className="grid">
          {jobs.map((job) => (
            <div key={job.jcn} style={{ background: "#fff", border: `2px solid ${colors.border}`, padding: 8, borderRadius: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 12 }}>
                <div>
                  <b>JCN:</b> {job.jcn}
                </div>
                <div>
                  <b>Equip:</b> {job.equipmentId}
                </div>
                <div>
                  <b>WUC:</b> {job.wuc}
                </div>
                <div>
                  <b>Status:</b> <span style={{ fontWeight: 800, color: statusColor(job.status) }}>{job.status}</span>
                </div>
              </div>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <b>Discrepancy:</b> {job.discrepancy}
              </div>
              {job.supplyRequests && job.supplyRequests.length > 0 ? (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <b>Supply Requests:</b>
                  <ul style={{ margin: 4 }}>
                    {job.supplyRequests.map((req, idx) => (
                      <li key={`${job.jcn}-supply-${idx}`}>
                        {req.quantity} × {req.noun} ({req.partNumber}) on {req.requestedOn}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {job.correctiveAction ? (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <b>Corrective Action:</b> {job.correctiveAction}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  );

  const Screen055 = () => {
    const selectedEquipment = formData.equipmentId ?? "";
    const list = jobs.filter((job) => job.equipmentId === selectedEquipment);
    return (
      <ScreenShell
        scr="055"
        title="EQUIPMENT STATUS"
        tutorialMode={tutorialMode}
        onExit={() => setCurrentScreen("000")}
        onClear={() => setFormData((prev) => ({ ...prev, equipmentId: "" }))}
        onXmit={() => undefined}
      >
        <div>
          <Label>Select Equipment ID</Label>
          <select
            value={selectedEquipment}
            onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
            className="field"
          >
            <option value="">Select...</option>
            {EQUIPMENT_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        {selectedEquipment ? (
          <div style={{ background: "#FEF3C7", border: "2px solid #F59E0B", padding: 12, marginTop: 12, borderRadius: 6 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>JOBS FOR {selectedEquipment}</div>
            {list.length === 0 ? (
              <p style={{ textAlign: "center", color: "#4b5563" }}>No jobs found for this equipment.</p>
            ) : (
              <div className="grid">
                {list.map((job) => (
                  <div key={job.jcn} style={{ background: "#fff", border: `1px solid ${colors.border}`, padding: 8, borderRadius: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 12 }}>
                      <div>
                        <b>JCN:</b> {job.jcn}
                      </div>
                      <div>
                        <b>Status:</b> <span style={{ fontWeight: 800, color: statusColor(job.status) }}>{job.status}</span>
                      </div>
                      <div>
                        <b>Work Center:</b> {job.workCenter}
                      </div>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      <b>Discrepancy:</b> {job.discrepancy}
                    </div>
                    {job.correctiveAction ? (
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        <b>Corrective Action:</b> {job.correctiveAction}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </ScreenShell>
    );
  };

  const Screen910 = () => (
    <ScreenShell
      scr="910"
      title="PRACTICE SCENARIOS"
      tutorialMode={tutorialMode}
      help="Select a scenario to practice IMDS workflows. Complete required steps to earn credit."
      onExit={() => setCurrentScreen("000")}
      onClear={() => undefined}
      onXmit={() => undefined}
    >
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Group title="Beginner" color="#1D4ED8">
          {SCENARIOS.beginner.map((scenario) => {
            const completed = completedScenarios.includes(scenario.id);
            const locked = scenario.dependsOn ? !completedScenarios.includes(scenario.dependsOn) : false;
            return (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                completed={completed}
                locked={locked}
                onStart={() => {
                  setCurrentScenario(scenario);
                  if (scenario.workflow) {
                    setWorkflowProgress((prev) => ({ ...prev, [scenario.id]: 0 }));
                  }
                  setCurrentScreen(scenario.startScreen);
                  resetForm();
                  if (scenario.requiredFields) {
                    setFormData((prev) => ({ ...prev, ...scenario.requiredFields }));
                  }
                }}
              />
            );
          })}
        </Group>
        <Group title="Intermediate" color="#B45309">
          {SCENARIOS.intermediate.map((scenario) => {
            const completed = completedScenarios.includes(scenario.id);
            const locked = scenario.dependsOn ? !completedScenarios.includes(scenario.dependsOn) : false;
            return (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                completed={completed}
                locked={locked}
                onStart={() => {
                  setCurrentScenario(scenario);
                  if (scenario.workflow) {
                    setWorkflowProgress((prev) => ({ ...prev, [scenario.id]: 0 }));
                  }
                  setCurrentScreen(scenario.startScreen);
                  resetForm();
                  if (scenario.requiredFields) {
                    setFormData((prev) => ({ ...prev, ...scenario.requiredFields }));
                  }
                }}
              />
            );
          })}
        </Group>
        <Group title="Advanced" color="#047857">
          {SCENARIOS.advanced.map((scenario) => {
            const completed = completedScenarios.includes(scenario.id);
            const locked = scenario.dependsOn ? !completedScenarios.includes(scenario.dependsOn) : false;
            return (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                completed={completed}
                locked={locked}
                onStart={() => {
                  setCurrentScenario(scenario);
                  if (scenario.workflow) {
                    setWorkflowProgress((prev) => ({ ...prev, [scenario.id]: 0 }));
                  }
                  setCurrentScreen(scenario.startScreen);
                  resetForm();
                  if (scenario.requiredFields) {
                    setFormData((prev) => ({ ...prev, ...scenario.requiredFields }));
                  }
                }}
              />
            );
          })}
        </Group>
      </div>
      {tutorialMode && currentScenario?.hints ? (
        <div style={{ marginTop: 16, background: "#DBEAFE", border: "2px solid #93C5FD", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 800 }}>Hints</div>
          <ul style={{ marginTop: 8 }}>
            {currentScenario.hints.map((hint) => (
              <li key={hint} style={{ fontSize: 12 }}>
                {hint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ScreenShell>
  );

  return (
    <>
      <StyleInjector />
      {message ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            background: "rgba(15, 23, 42, 0.92)",
            color: "#FBBF24",
            padding: "10px 16px",
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.45)",
            zIndex: 20
          }}
        >
          {message}
        </div>
      ) : null}
      {currentScreen === "000" && <Menu000 />}
      {currentScreen === "073" && <Screen073 />}
      {currentScreen === "122" && <Screen122 />}
      {currentScreen === "350" && <Screen350 />}
      {currentScreen === "063" && <Screen063 />}
      {currentScreen === "380" && <Screen380 />}
      {currentScreen === "055" && <Screen055 />}
      {currentScreen === "910" && <Screen910 />}
    </>
  );
};

export default IMDSTrainer;
