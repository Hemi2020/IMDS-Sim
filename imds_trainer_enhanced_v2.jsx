import React, { useState, useRef, useEffect } from "react";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * HH-60W IMDS TRAINING SIMULATOR - Enhanced Version 2.0
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * UPDATES:
 * - Exact Screen 073 layout matching real IMDS
 * - Fixed textarea focus issue
 * - Julian date format (YYDDD) + military time
 * - Prevents future scheduling
 * - Consistent beige colors across all screens
 * - Yellow reports with black text (Screens 122, 380)
 */

// ═══════════════════════════════════════════════════════════════════════
// AIR FORCE CODE LIBRARIES
// ═══════════════════════════════════════════════════════════════════════

const HH60W_WUC_CODES = [
  { code: "110000", desc: "Airframe - General" },
  { code: "111000", desc: "Fuselage - Main" },
  { code: "112000", desc: "Tail Boom" },
  { code: "620000", desc: "Main Rotor System" },
  { code: "621000", desc: "Main Rotor Blades" },
  { code: "622000", desc: "Main Rotor Hub" },
  { code: "630000", desc: "Tail Rotor System" },
  { code: "631000", desc: "Tail Rotor Blades" },
  { code: "720000", desc: "Engine No. 1" },
  { code: "721000", desc: "Engine No. 1 - Compressor" },
  { code: "730000", desc: "Engine No. 2" },
  { code: "630000", desc: "Main Transmission" },
  { code: "280000", desc: "Fuel System" },
  { code: "290000", desc: "Hydraulic System - Primary" },
  { code: "240000", desc: "Electrical Power Supply" },
  { code: "270000", desc: "Flight Control System" },
  { code: "510000", desc: "Flight Instruments" },
  { code: "460000", desc: "Navigation System" },
  { code: "630000", desc: "VHF Communications" },
  { code: "410000", desc: "Air Conditioning" },
  { code: "490000", desc: "APU" },
  { code: "990000", desc: "Not Otherwise Classified" },
];

const WHEN_DISCOVERED_CODES = {
  "A": "Acceptance Inspection",
  "B": "Flying/Operational Check",
  "C": "Scheduled/Special Inspection",
  "F": "Functional Check Flight",
  "G": "Ground Abort",
  "M": "In-Flight",
  "O": "Ground Operations",
  "P": "Pre-flight/Post-flight",
};

const HOW_MALFUNCTION_CODES = {
  "A": "Structural Failure", "B": "Burned", "C": "Corroded",
  "E": "Excessive Wear", "F": "Failed to Operate", "G": "Gave Incorrect Info",
  "H": "Hydraulic Leak", "J": "Jammed", "K": "Cracked",
  "L": "Loosened", "M": "Missing", "N": "Not Adjusted",
  "P": "Pneumatic Leak", "R": "Ruptured", "S": "Shorted",
  "T": "Bent/Twisted", "U": "Unknown", "W": "Worn",
  "X": "Broken", "Z": "Other",
};

const ACTION_TAKEN_CODES = {
  "A": "Adjusted", "B": "Repaired by Welding", "C": "Cleaned",
  "D": "Operational Check OK", "E": "Examined - No Defect",
  "G": "Serviced", "I": "Installed", "K": "Checked OK",
  "O": "Reinstalled", "P": "Replaced", "R": "Removed",
  "T": "Tightened", "X": "Tested OK",
};

const TYPE_MAINTENANCE_CODES = {
  "C": "Corrosion Control", "I": "Inspection",
  "O": "Operational Check", "R": "Repair",
  "S": "Scheduled", "U": "Unscheduled",
};

const WORK_CENTERS = ["JFLTL", "JFENG", "JFAVS", "JFELC", "JFSHP", "JFHYD"];
const EQUIPMENT_IDS = ["A6001", "A6002", "A6003", "A6004", "A6005", "A6006", "A6007", "A6008"];
const JOB_SYMBOLS = { "X": "Repeat/Recur", "-": "Normal", "/": "Special Interest", "~": "TCTO" };

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function getJulianDate() {
  const now = new Date();
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const ddd = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(3, '0');
  return yy + ddd;
}

function getMilitaryTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return hh + mm;
}

function isValidJulianDate(dateStr) {
  if (!dateStr || dateStr.length !== 5) return false;
  const yy = parseInt(dateStr.substring(0, 2));
  const ddd = parseInt(dateStr.substring(2, 5));
  return ddd >= 1 && ddd <= 366 && yy >= 0 && yy <= 99;
}

function julianToDate(julianStr) {
  const yy = parseInt(julianStr.substring(0, 2));
  const ddd = parseInt(julianStr.substring(2, 5));
  const year = 2000 + yy;
  const date = new Date(year, 0);
  date.setDate(ddd);
  return date;
}

function isFutureDate(julianDate, militaryTime) {
  const now = new Date();
  const inputDate = julianToDate(julianDate);
  
  if (!militaryTime || militaryTime.length !== 4) return inputDate > now;
  
  const hh = parseInt(militaryTime.substring(0, 2));
  const mm = parseInt(militaryTime.substring(2, 4));
  inputDate.setHours(hh, mm, 0, 0);
  
  return inputDate > now;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function IMDSTrainerEnhanced() {
  const [screen, setScreen] = useState("000");
  const [jobs, setJobs] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [persist, setPersist] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  
  const jcnBaseRef = useRef(null);
  const jcnSeqRef = useRef(0);
  
  // Form states
  const [f073, setF073] = useState({
    manualJcn: "",
    startDate: getJulianDate(),
    startTime: getMilitaryTime(),
    equipmentId: "",
    workCenter: "",
    autoFillPWC: false,
    whenDiscovered: "",
    componentPosition: "",
    wuc: "",
    priority: "3",
    symbol: "-",
    deferCode: "",
    jobDuration: "",
    copyToWCE: true,
    discrepancy: "",
    wceSymbol: "X",
    jobFollowing: false,
    partsRequired: false,
    notifyPWC: false,
    notifyOWC: false,
    notifyCA: false,
  });
  
  const [f122, setF122] = useState({ query: "", searchType: "jcn" });
  const [f914, setF914] = useState({
    jcn: "", wce: "001", unitsProduced: "00",
    actionTaken: "", howMalfunction: "", correctiveAction: "",
    correctedBy: "", inspectedBy: "", startTime: "", stopTime: "",
  });
  const [f380, setF380] = useState({ filter: "all", workCenter: "all" });
  const [f055, setF055] = useState({ equipmentId: "" });
  
  // JCN Generation
  function generateJCN() {
    const base = getJulianDate();
    if (jcnBaseRef.current !== base) {
      jcnBaseRef.current = base;
      jcnSeqRef.current = 0;
    }
    jcnSeqRef.current += 1;
    return base + String(jcnSeqRef.current).padStart(4, '0');
  }
  
  // Persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem("imdsTrainerJobs");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setJobs(arr);
      }
      const p = localStorage.getItem("imdsTrainerPersist") === "1";
      setPersist(p);
    } catch(e) {}
  }, []);
  
  useEffect(() => {
    try {
      if (persist) localStorage.setItem("imdsTrainerJobs", JSON.stringify(jobs));
    } catch(e) {}
  }, [jobs, persist]);
  
  function showMessage(message, type = "info") {
    setMsg(message);
    setMsgType(type);
  }
  
  function resetMsg() {
    setMsg("");
    setMsgType("info");
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 000 - MAIN MENU
  // ═══════════════════════════════════════════════════════════════════════
  
  const Screen000 = () => (
    <div className="space-y-4">
      <div className="bg-[#D4C5B0] border-2 border-black p-4 rounded">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">INTEGRATED MAINTENANCE DATA SYSTEM</h1>
            <p className="text-sm">HH-60W Crew Chief Training Simulator</p>
          </div>
          <div className="text-right text-sm">
            <div>Unit: 58 SOW</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-black p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{jobs.filter(j => j.status === 'OPEN').length}</div>
            <div className="text-xs">OPEN</div>
          </div>
          <div className="bg-white border border-black p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{jobs.filter(j => j.status === 'IN-WORK').length}</div>
            <div className="text-xs">IN-WORK</div>
          </div>
          <div className="bg-white border border-black p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{jobs.filter(j => j.status === 'COMPLETED').length}</div>
            <div className="text-xs">COMPLETED</div>
          </div>
          <div className="bg-white border border-black p-3 text-center">
            <div className="text-2xl font-bold">{jobs.length}</div>
            <div className="text-xs">TOTAL</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setScreen("073")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded">
            073 - Schedule Maintenance
          </button>
          <button onClick={() => setScreen("122")} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
            122 - Maintenance Snapshot
          </button>
          <button onClick={() => setScreen("914")} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded">
            914 - On-Equipment Maint
          </button>
          <button onClick={() => setScreen("380")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded">
            380 - Document Maint
          </button>
          <button onClick={() => setScreen("055")} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded">
            055 - Equipment Status
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={persist} onChange={e => {
              const v = e.target.checked;
              setPersist(v);
              try { localStorage.setItem("imdsTrainerPersist", v ? "1" : "0"); } catch(e) {}
              if (!v) { try { localStorage.removeItem("imdsTrainerJobs"); } catch(e) {} }
            }} />
            Persist Data
          </label>
          <button onClick={() => {
            if (confirm("Clear all jobs?")) {
              setJobs([]);
              setLastCreated(null);
              showMessage("All jobs cleared", "info");
            }
          }} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded">
            Clear All
          </button>
        </div>
        
        {lastCreated && (
          <div className="mt-3 bg-green-100 border border-green-600 p-2 text-sm">
            <strong>Last Created:</strong> JCN {lastCreated.jcn} / WCE {lastCreated.wce}
          </div>
        )}
        
        {msg && (
          <div className={`mt-3 p-2 border text-sm ${
            msgType === 'success' ? 'bg-green-100 border-green-600' :
            msgType === 'error' ? 'bg-red-100 border-red-600' :
            msgType === 'warning' ? 'bg-yellow-100 border-yellow-600' :
            'bg-blue-100 border-blue-600'
          }`}>{msg}</div>
        )}
      </div>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 073 - SCHEDULE MAINTENANCE (EXACT LAYOUT)
  // ═══════════════════════════════════════════════════════════════════════
  
  function submit073() {
    // Validate required fields
    const required = ["equipmentId", "workCenter", "whenDiscovered", "wuc", "discrepancy"];
    for (const field of required) {
      if (!f073[field] || String(f073[field]).trim() === "") {
        showMessage(`Missing required field: ${field.toUpperCase()}`, "error");
        return;
      }
    }
    
    // Validate Equipment ID format
    if (!/^A\d{4}$/.test(f073.equipmentId)) {
      showMessage("Equipment ID must be format: A#### (e.g., A6001)", "error");
      return;
    }
    
    // Validate WUC
    if (f073.wuc.length !== 6) {
      showMessage("WUC must be 6 digits", "error");
      return;
    }
    
    // Validate Julian date
    if (!isValidJulianDate(f073.startDate)) {
      showMessage("Invalid Julian date format. Must be YYDDD", "error");
      return;
    }
    
    // Validate military time
    if (!/^\d{4}$/.test(f073.startTime)) {
      showMessage("Invalid time format. Must be HHMM (military time)", "error");
      return;
    }
    
    // Check if future date
    if (isFutureDate(f073.startDate, f073.startTime)) {
      showMessage("Cannot schedule jobs in the future", "error");
      return;
    }
    
    // Check for multiple defects
    if (/[;,]|\band\b/i.test(f073.discrepancy)) {
      showMessage("Warning: TO 00-20-1 requires one defect per discrepancy block", "warning");
    }
    
    // Generate JCN
    const jcn = f073.manualJcn && f073.manualJcn.trim() 
      ? f073.manualJcn.trim().toUpperCase() 
      : generateJCN();
    const wce = "001";
    
    // Create job
    const job = {
      jcn, wce,
      equipmentId: f073.equipmentId.toUpperCase(),
      wuc: f073.wuc.toUpperCase(),
      whenDiscovered: f073.whenDiscovered.toUpperCase(),
      discrepancy: f073.discrepancy,
      workCenter: f073.workCenter.toUpperCase(),
      priority: f073.priority,
      symbol: f073.symbol,
      startDate: f073.startDate,
      startTime: f073.startTime,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    
    setJobs(prev => [...prev, job]);
    setLastCreated({ jcn, wce });
    showMessage(`✅ JCN CREATED — ${jcn} | WCE ${wce}`, "success");
    
    // Reset form
    setF073({
      ...f073,
      manualJcn: "",
      equipmentId: "",
      wuc: "",
      whenDiscovered: "",
      componentPosition: "",
      discrepancy: "",
      workCenter: "",
      startDate: getJulianDate(),
      startTime: getMilitaryTime(),
    });
  }
  
  const Screen073 = () => (
    <div className="space-y-3">
      {/* Header matching screenshot */}
      <div className="bg-[#C0C0C0] border border-black p-2 rounded flex justify-between items-center">
        <div className="font-bold">Schedule Maintenance (073-EAR)</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Event ID</label>
            <input type="text" className="border border-black px-2 py-1 w-32 bg-white text-sm" disabled />
          </div>
          <div className="text-xs italic">*Required Fields</div>
          <div className="flex items-center gap-1">
            <label className="text-sm">Unit</label>
            <select className="border border-black px-1 py-1 text-sm bg-white">
              <option>F</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Main Form - Exact layout from screenshot */}
      <div className="bg-[#D4C5B0] border-2 border-black p-3 rounded">
        {/* Row 1 */}
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Manual JCN</label>
            <input
              type="text"
              value={f073.manualJcn}
              onChange={e => setF073({...f073, manualJcn: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            />
          </div>
          
          <div className="col-span-3">
            <label className="text-xs font-bold block mb-1">Start Date/Time</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={f073.startDate}
                onChange={e => setF073({...f073, startDate: e.target.value})}
                maxLength={5}
                placeholder="YYDDD"
                className="w-16 border border-black px-1 py-1 text-sm bg-white"
              />
              <input
                type="text"
                value={f073.startTime}
                onChange={e => setF073({...f073, startTime: e.target.value})}
                maxLength={4}
                placeholder="HHMM"
                className="w-14 border border-black px-1 py-1 text-sm bg-white"
              />
            </div>
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Equipment ID *</label>
            <select
              value={f073.equipmentId}
              onChange={e => setF073({...f073, equipmentId: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {EQUIPMENT_IDS.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          
          <div className="col-span-5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold">Performing Work Center *</label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={f073.autoFillPWC}
                  onChange={e => setF073({...f073, autoFillPWC: e.target.checked})}
                />
                Auto-Fill with my PWC
              </label>
            </div>
            <select
              value={f073.workCenter}
              onChange={e => setF073({...f073, workCenter: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {WORK_CENTERS.map(wc => <option key={wc} value={wc}>{wc}</option>)}
            </select>
          </div>
        </div>
        
        {/* Row 2 */}
        <div className="grid grid-cols-12 gap-2 mb-3">
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">When Discovered *</label>
            <select
              value={f073.whenDiscovered}
              onChange={e => setF073({...f073, whenDiscovered: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {Object.entries(WHEN_DISCOVERED_CODES).map(([code, desc]) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Component Position</label>
            <select
              value={f073.componentPosition}
              onChange={e => setF073({...f073, componentPosition: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              <option value="">--</option>
            </select>
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">WUC/LCN *</label>
            <select
              value={f073.wuc}
              onChange={e => setF073({...f073, wuc: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {HH60W_WUC_CODES.map(w => (
                <option key={w.code} value={w.code}>{w.code}</option>
              ))}
            </select>
          </div>
          
          <div className="col-span-1">
            <label className="text-xs font-bold block mb-1">Priority</label>
            <select
              value={f073.priority}
              onChange={e => setF073({...f073, priority: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          
          <div className="col-span-1">
            <label className="text-xs font-bold block mb-1">Symbol</label>
            <select
              value={f073.symbol}
              onChange={e => setF073({...f073, symbol: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            >
              {Object.keys(JOB_SYMBOLS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Defer Code</label>
            <input
              type="text"
              value={f073.deferCode}
              onChange={e => setF073({...f073, deferCode: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            />
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Job Duration</label>
            <input
              type="text"
              value={f073.jobDuration}
              onChange={e => setF073({...f073, jobDuration: e.target.value})}
              className="w-full border border-black px-1 py-1 text-sm bg-white"
            />
          </div>
        </div>
        
        {/* Discrepancy Section */}
        <div className="border-2 border-black p-2 mb-3 bg-[#E8E4D0] rounded">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="copyToWCE"
              checked={f073.copyToWCE}
              onChange={e => setF073({...f073, copyToWCE: e.target.checked})}
            />
            <label htmlFor="copyToWCE" className="text-xs font-bold">Copy to WCE Narrative</label>
            <label className="text-xs font-bold ml-4">Discrepancy *</label>
          </div>
          <textarea
            value={f073.discrepancy}
            onChange={e => setF073({...f073, discrepancy: e.target.value})}
            rows={4}
            className="w-full border border-black px-2 py-1 text-sm bg-white resize-none"
            placeholder="Enter discrepancy description... (One defect per block - TO 00-20-1)"
          />
        </div>
        
        {/* Row 3 - WCE Symbol and Checkboxes */}
        <div className="flex items-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold">WCE Symbol</label>
            <select
              value={f073.wceSymbol}
              onChange={e => setF073({...f073, wceSymbol: e.target.value})}
              className="border border-black px-2 py-1 text-sm bg-white w-16"
            >
              <option>X</option>
              <option>-</option>
              <option>/</option>
              <option>~</option>
            </select>
          </div>
          
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={f073.jobFollowing}
              onChange={e => setF073({...f073, jobFollowing: e.target.checked})}
            />
            Job Following
          </label>
          
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={f073.partsRequired}
              onChange={e => setF073({...f073, partsRequired: e.target.checked})}
            />
            Parts Required
          </label>
        </div>
        
        {/* Notify Section */}
        <div className="border border-black p-2 mb-3 bg-[#E8E4D0] rounded">
          <div className="text-xs font-bold mb-1">Notify</div>
          <div className="flex gap-6">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={f073.notifyPWC}
                onChange={e => setF073({...f073, notifyPWC: e.target.checked})}
              />
              Performing Work Center
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={f073.notifyOWC}
                onChange={e => setF073({...f073, notifyOWC: e.target.checked})}
              />
              Originating Work Center
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={f073.notifyCA}
                onChange={e => setF073({...f073, notifyCA: e.target.checked})}
              />
              Controlling Agency
            </label>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={submit073}
            className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
          >
            Xmit
          </button>
          <button
            onClick={() => {
              setF073({
                manualJcn: "", startDate: getJulianDate(), startTime: getMilitaryTime(),
                equipmentId: "", workCenter: "", autoFillPWC: false,
                whenDiscovered: "", componentPosition: "", wuc: "",
                priority: "3", symbol: "-", deferCode: "", jobDuration: "",
                copyToWCE: true, discrepancy: "", wceSymbol: "X",
                jobFollowing: false, partsRequired: false,
                notifyPWC: false, notifyOWC: false, notifyCA: false,
              });
              resetMsg();
            }}
            className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
          >
            Clear
          </button>
          <button
            onClick={() => { setScreen("000"); resetMsg(); }}
            className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
          >
            Menu
          </button>
        </div>
      </div>
      
      {/* Messages */}
      {msg && (
        <div className={`p-3 border-2 rounded ${
          msgType === 'success' ? 'bg-green-100 border-green-600' :
          msgType === 'error' ? 'bg-red-100 border-red-600' :
          msgType === 'warning' ? 'bg-yellow-100 border-yellow-600' :
          'bg-blue-100 border-blue-600'
        }`}>{msg}</div>
      )}
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 122 - MAINTENANCE SNAPSHOT (YELLOW REPORT)
  // ═══════════════════════════════════════════════════════════════════════
  
  function results122() {
    const q = (f122.query || "").trim().toUpperCase();
    if (!q) return [];
    return f122.searchType === "jcn" 
      ? jobs.filter(j => j.jcn.includes(q))
      : jobs.filter(j => j.equipmentId.includes(q));
  }
  
  const Screen122 = () => {
    const results = results122();
    
    return (
      <div className="space-y-3">
        <div className="bg-[#C0C0C0] border border-black p-2 rounded flex justify-between items-center">
          <div className="font-bold">Maintenance Snapshot (122)</div>
          <div className="text-sm">{new Date().toLocaleString()}</div>
        </div>
        
        <div className="bg-[#D4C5B0] border-2 border-black p-3 rounded">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold block mb-1">Search Type</label>
              <select
                value={f122.searchType}
                onChange={e => setF122({...f122, searchType: e.target.value})}
                className="w-full border border-black px-2 py-1 text-sm bg-white"
              >
                <option value="jcn">Job Control Number</option>
                <option value="equipmentId">Equipment ID</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold block mb-1">Search Value</label>
              <input
                type="text"
                value={f122.query}
                onChange={e => setF122({...f122, query: e.target.value})}
                className="w-full border border-black px-2 py-1 text-sm bg-white"
                placeholder={f122.searchType === 'jcn' ? "Enter JCN..." : "Enter Equipment ID..."}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setF122({...f122})}
              className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
            >
              Search
            </button>
            <button
              onClick={() => setF122({query: "", searchType: "jcn"})}
              className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
            >
              Clear
            </button>
            <button
              onClick={() => { setScreen("000"); resetMsg(); }}
              className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded"
            >
              Menu
            </button>
          </div>
        </div>
        
        {/* YELLOW REPORT */}
        {f122.query && (
          <div className="bg-yellow-100 border-2 border-black p-4 rounded font-mono text-sm">
            <div className="font-bold text-center mb-4">MAINTENANCE SNAPSHOT REPORT</div>
            
            {results.length === 0 ? (
              <div className="text-center py-4">No matching jobs found.</div>
            ) : (
              <div className="space-y-3">
                {results.map(j => (
                  <div key={j.jcn + j.wce} className="border border-black p-2 bg-yellow-50">
                    <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                      <div><strong>JCN:</strong> {j.jcn}</div>
                      <div><strong>WCE:</strong> {j.wce}</div>
                      <div><strong>Status:</strong> <span className={
                        j.status === 'COMPLETED' ? 'text-green-700 font-bold' :
                        j.status === 'IN-WORK' ? 'text-yellow-700 font-bold' :
                        'text-red-700 font-bold'
                      }>{j.status}</span></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div><strong>Equipment:</strong> {j.equipmentId}</div>
                      <div><strong>WUC:</strong> {j.wuc}</div>
                      <div><strong>When Disc:</strong> {j.whenDiscovered}</div>
                      <div><strong>Work Center:</strong> {j.workCenter}</div>
                      <div><strong>Priority:</strong> {j.priority}</div>
                      <div><strong>Symbol:</strong> {j.symbol}</div>
                    </div>
                    
                    <div className="border-t border-black pt-1 text-xs">
                      <div><strong>Discrepancy:</strong></div>
                      <div className="pl-2">{j.discrepancy}</div>
                    </div>
                    
                    {j.correctiveAction && (
                      <div className="border-t border-black mt-1 pt-1 text-xs">
                        <div><strong>Corrective Action:</strong></div>
                        <div className="pl-2">{j.correctiveAction}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 914 - ON-EQUIPMENT MAINTENANCE
  // ═══════════════════════════════════════════════════════════════════════
  
  function listUniqueJCNs() {
    const unique = [];
    const seen = new Set();
    jobs.forEach(j => {
      if (!seen.has(j.jcn)) {
        seen.add(j.jcn);
        unique.push(j);
      }
    });
    return unique;
  }
  
  function submit914() {
    if (!f914.jcn) {
      showMessage("Please select a JCN", "error");
      return;
    }
    
    const idx = jobs.findIndex(j => j.jcn === f914.jcn && j.wce === f914.wce);
    if (idx === -1) {
      showMessage("JCN/WCE not found", "error");
      return;
    }
    
    const copy = [...jobs];
    const rec = {...copy[idx]};
    
    if (f914.actionTaken) rec.actionTaken = f914.actionTaken;
    if (f914.howMalfunction) rec.howMalfunction = f914.howMalfunction;
    if (f914.correctiveAction) rec.correctiveAction = f914.correctiveAction;
    if (f914.correctedBy) rec.correctedBy = f914.correctedBy;
    if (f914.inspectedBy) rec.inspectedBy = f914.inspectedBy;
    
    if (f914.unitsProduced) {
      rec.unitsProduced = f914.unitsProduced;
      rec.status = f914.unitsProduced === "01" ? "COMPLETED" : 
                   f914.unitsProduced === "00" ? "OPEN" : "IN-WORK";
    }
    
    copy[idx] = rec;
    setJobs(copy);
    showMessage(`✅ Job Updated — ${rec.jcn}/${rec.wce} → ${rec.status}`, "success");
    
    setF914({
      jcn: "", wce: "001", unitsProduced: "00",
      actionTaken: "", howMalfunction: "", correctiveAction: "",
      correctedBy: "", inspectedBy: "", startTime: "", stopTime: "",
    });
  }
  
  const Screen914 = () => (
    <div className="space-y-3">
      <div className="bg-[#C0C0C0] border border-black p-2 rounded flex justify-between items-center">
        <div className="font-bold">On-Equipment Maintenance (914)</div>
        <div className="text-sm">{new Date().toLocaleString()}</div>
      </div>
      
      <div className="bg-[#D4C5B0] border-2 border-black p-3 rounded">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-bold block mb-1">JCN *</label>
            <select
              value={f914.jcn}
              onChange={e => setF914({...f914, jcn: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            >
              <option value="">-- Select JCN --</option>
              {listUniqueJCNs().map(j => (
                <option key={j.jcn} value={j.jcn}>
                  {j.jcn} - {j.equipmentId}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">WCE</label>
            <input
              type="text"
              value={f914.wce}
              onChange={e => setF914({...f914, wce: e.target.value})}
              maxLength={3}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">Action Taken</label>
            <select
              value={f914.actionTaken}
              onChange={e => setF914({...f914, actionTaken: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {Object.entries(ACTION_TAKEN_CODES).map(([code, desc]) => (
                <option key={code} value={code}>{code} - {desc}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">How Malfunction</label>
            <select
              value={f914.howMalfunction}
              onChange={e => setF914({...f914, howMalfunction: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            >
              <option value="">--</option>
              {Object.entries(HOW_MALFUNCTION_CODES).map(([code, desc]) => (
                <option key={code} value={code}>{code} - {desc}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">Units Produced</label>
            <select
              value={f914.unitsProduced}
              onChange={e => setF914({...f914, unitsProduced: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            >
              <option value="00">00 - Keep Open</option>
              <option value="01">01 - Complete</option>
            </select>
          </div>
          
          <div className="col-span-2">
            <label className="text-xs font-bold block mb-1">Corrective Action</label>
            <textarea
              value={f914.correctiveAction}
              onChange={e => setF914({...f914, correctiveAction: e.target.value})}
              rows={3}
              className="w-full border border-black px-2 py-1 text-sm bg-white resize-none"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">Corrected By</label>
            <input
              type="text"
              value={f914.correctedBy}
              onChange={e => setF914({...f914, correctedBy: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold block mb-1">Inspected By</label>
            <input
              type="text"
              value={f914.inspectedBy}
              onChange={e => setF914({...f914, inspectedBy: e.target.value})}
              className="w-full border border-black px-2 py-1 text-sm bg-white"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={submit914} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
            Xmit
          </button>
          <button onClick={() => {
            setF914({
              jcn: "", wce: "001", unitsProduced: "00",
              actionTaken: "", howMalfunction: "", correctiveAction: "",
              correctedBy: "", inspectedBy: "", startTime: "", stopTime: "",
            });
            resetMsg();
          }} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
            Clear
          </button>
          <button onClick={() => { setScreen("000"); resetMsg(); }} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
            Menu
          </button>
        </div>
      </div>
      
      {msg && (
        <div className={`p-3 border-2 rounded ${
          msgType === 'success' ? 'bg-green-100 border-green-600' :
          msgType === 'error' ? 'bg-red-100 border-red-600' :
          'bg-yellow-100 border-yellow-600'
        }`}>{msg}</div>
      )}
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 380 - DOCUMENT MAINTENANCE (YELLOW REPORT)
  // ═══════════════════════════════════════════════════════════════════════
  
  function exportCSV() {
    const headers = ["jcn","wce","status","equipmentId","wuc","whenDiscovered","workCenter","priority","symbol","discrepancy","correctiveAction"];
    const lines = [headers.join(",")];
    jobs.forEach(j => {
      const row = headers.map(h => {
        const val = j[h] != null ? String(j[h]).replace(/[,\n\r]/g, ' ') : "";
        return `"${val}"`;
      });
      lines.push(row.join(","));
    });
    
    const blob = new Blob([lines.join("\n")], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imds_jobs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMessage("✅ CSV exported", "success");
  }
  
  function getFilteredJobs() {
    let filtered = [...jobs];
    if (f380.filter !== "all") filtered = filtered.filter(j => j.status === f380.filter);
    if (f380.workCenter !== "all") filtered = filtered.filter(j => j.workCenter === f380.workCenter);
    return filtered;
  }
  
  const Screen380 = () => {
    const filtered = getFilteredJobs();
    
    return (
      <div className="space-y-3">
        <div className="bg-[#C0C0C0] border border-black p-2 rounded flex justify-between items-center">
          <div className="font-bold">Document Maintenance (380)</div>
          <div className="text-sm">{new Date().toLocaleString()}</div>
        </div>
        
        <div className="bg-[#D4C5B0] border-2 border-black p-3 rounded">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold block mb-1">Status Filter</label>
              <select
                value={f380.filter}
                onChange={e => setF380({...f380, filter: e.target.value})}
                className="w-full border border-black px-2 py-1 text-sm bg-white"
              >
                <option value="all">All Jobs</option>
                <option value="OPEN">Open</option>
                <option value="IN-WORK">In-Work</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold block mb-1">Work Center Filter</label>
              <select
                value={f380.workCenter}
                onChange={e => setF380({...f380, workCenter: e.target.value})}
                className="w-full border border-black px-2 py-1 text-sm bg-white"
              >
                <option value="all">All</option>
                {WORK_CENTERS.map(wc => <option key={wc} value={wc}>{wc}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
              Export CSV
            </button>
            <button onClick={() => { setScreen("000"); resetMsg(); }} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
              Menu
            </button>
          </div>
        </div>
        
        {/* YELLOW REPORT */}
        <div className="bg-yellow-100 border-2 border-black p-4 rounded font-mono text-sm">
          <div className="font-bold text-center mb-4">JOB LIST ({filtered.length} jobs)</div>
          
          {filtered.length === 0 ? (
            <div className="text-center py-4">No jobs match filters.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(j => (
                <div key={j.jcn + j.wce} className="border border-black p-2 bg-yellow-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">{j.jcn} / {j.wce}</span>
                    <span className={`px-2 py-1 text-xs font-bold ${
                      j.status === 'COMPLETED' ? 'bg-green-200' :
                      j.status === 'IN-WORK' ? 'bg-yellow-200' :
                      'bg-red-200'
                    }`}>{j.status}</span>
                  </div>
                  <div className="text-xs grid grid-cols-2 gap-1">
                    <div><strong>Equip:</strong> {j.equipmentId}</div>
                    <div><strong>WUC:</strong> {j.wuc}</div>
                    <div><strong>WC:</strong> {j.workCenter}</div>
                    <div><strong>Pri:</strong> {j.priority}</div>
                  </div>
                  <div className="text-xs mt-1">
                    <strong>Disc:</strong> {j.discrepancy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 055 - EQUIPMENT STATUS
  // ═══════════════════════════════════════════════════════════════════════
  
  const Screen055 = () => {
    const selectedJobs = jobs.filter(j => j.equipmentId === f055.equipmentId);
    
    return (
      <div className="space-y-3">
        <div className="bg-[#C0C0C0] border border-black p-2 rounded flex justify-between items-center">
          <div className="font-bold">Equipment Status (055)</div>
          <div className="text-sm">{new Date().toLocaleString()}</div>
        </div>
        
        <div className="bg-[#D4C5B0] border-2 border-black p-3 rounded">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold block mb-1">Equipment ID</label>
              <select
                value={f055.equipmentId}
                onChange={e => setF055({...f055, equipmentId: e.target.value})}
                className="w-full border border-black px-2 py-1 text-sm bg-white"
              >
                <option value="">-- Select --</option>
                {EQUIPMENT_IDS.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>
          
          <button onClick={() => { setScreen("000"); resetMsg(); }} className="bg-gray-300 hover:bg-gray-400 border border-black px-6 py-2 text-sm font-bold rounded">
            Menu
          </button>
        </div>
        
        {f055.equipmentId && (
          <div className="bg-[#D4C5B0] border-2 border-black p-4 rounded">
            <div className="text-center font-bold mb-4">EQUIPMENT: {f055.equipmentId}</div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-100 border border-black p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{selectedJobs.filter(j => j.status === 'OPEN').length}</div>
                <div className="text-xs">OPEN</div>
              </div>
              <div className="bg-yellow-100 border border-black p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{selectedJobs.filter(j => j.status === 'IN-WORK').length}</div>
                <div className="text-xs">IN-WORK</div>
              </div>
              <div className="bg-green-100 border border-black p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{selectedJobs.filter(j => j.status === 'COMPLETED').length}</div>
                <div className="text-xs">COMPLETED</div>
              </div>
            </div>
            
            {selectedJobs.length === 0 ? (
              <div className="text-center text-sm py-4">No jobs for this equipment.</div>
            ) : (
              <div className="space-y-2">
                {selectedJobs.map(j => (
                  <div key={j.jcn + j.wce} className="border border-black p-2 bg-white">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-bold">{j.jcn} / {j.wce}</span>
                      <span className={`px-2 py-1 font-bold ${
                        j.status === 'COMPLETED' ? 'bg-green-200' :
                        j.status === 'IN-WORK' ? 'bg-yellow-200' :
                        'bg-red-200'
                      }`}>{j.status}</span>
                    </div>
                    <div className="text-xs">
                      <div><strong>WUC:</strong> {j.wuc}</div>
                      <div><strong>Disc:</strong> {j.discrepancy}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════
  
  const NavBar = () => (
    <div className="bg-gray-700 p-2 rounded mb-3">
      <div className="flex gap-2 justify-center flex-wrap">
        {["000","073","122","914","380","055"].map(s => (
          <button
            key={s}
            onClick={() => { setScreen(s); resetMsg(); }}
            className={`px-4 py-1 rounded font-bold text-sm ${
              screen === s ? "bg-blue-500 text-white" : "bg-gray-500 text-white hover:bg-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  
  return (
    <div className="min-h-screen bg-gray-300 p-4">
      <div className="max-w-6xl mx-auto">
        <NavBar />
        {screen === "000" && <Screen000 />}
        {screen === "073" && <Screen073 />}
        {screen === "122" && <Screen122 />}
        {screen === "914" && <Screen914 />}
        {screen === "380" && <Screen380 />}
        {screen === "055" && <Screen055 />}
      </div>
    </div>
  );
}
