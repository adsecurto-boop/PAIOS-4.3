import React, { useState } from 'react';
import {
  Pill,
  ShieldAlert,
  HeartPulse,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Copy,
  FileText,
  Calendar,
  PhoneCall,
  Info,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Stethoscope,
  Flame,
  UserCheck,
  Edit2,
  Trash2,
  Phone,
  Building2,
  Mail,
  MapPin,
  CalendarCheck,
  PlusCircle,
  Minus,
  Edit3,
} from 'lucide-react';
import {
  Medication,
  DoseEvent,
  DoseStatus,
  RefillInventory,
  VitalSign,
  DoctorContact,
  Appointment,
} from '../types';
import { PAIOSStorage, getTodayDateString } from '../storage';

export function calcRefillStockDetails(refill: RefillInventory, todayStr: string) {
  const purchaseDateStr = refill.purchaseDateString || refill.lastRefillDateString || '2026-08-01';
  const daysSupplied = refill.daysSupplied || 30;

  const timingSlots: ('Morning' | 'Afternoon' | 'Night')[] =
    refill.timingSlots && refill.timingSlots.length > 0
      ? refill.timingSlots
      : ['Morning'];

  const dosesPerDay = refill.dosesPerDay || timingSlots.length || refill.dailyBurnRate || 1;
  const totalBought = daysSupplied * dosesPerDay;

  // Days elapsed calculation
  const purchaseDate = new Date(purchaseDateStr);
  const currentDate = new Date(todayStr);
  const diffTime = Math.max(0, currentDate.getTime() - purchaseDate.getTime());
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dosesConsumed = daysElapsed * dosesPerDay;
  const formulaRemaining = Math.max(0, totalBought - dosesConsumed);
  const daysLeftFormula = Math.max(0, Math.floor(formulaRemaining / dosesPerDay));

  const isManuallyAdjusted = refill.quantityRemaining !== formulaRemaining;

  return {
    purchaseDateStr,
    daysSupplied,
    timingSlots,
    dosesPerDay,
    totalBought,
    daysElapsed,
    dosesConsumed,
    formulaRemaining,
    daysLeftFormula,
    isManuallyAdjusted,
  };
}

interface HealthScreenProps {
  medications: Medication[];
  doseEvents: DoseEvent[];
  refillInventories: RefillInventory[];
  vitalSigns: VitalSign[];
  doctors: DoctorContact[];
  appointments: Appointment[];
  onLogDose: (doseId: string, status: DoseStatus, note?: string) => void;
  onUpdateRefill: (id: string, newQty: number) => void;
  onSaveRefill: (refill: RefillInventory) => void;
  onDeleteRefill: (id: string) => void;
  onLogVital: (vital: Omit<VitalSign, 'id' | 'timestampMillis'>) => void;
  onAddMedication: (med: Medication) => void;
  onDeleteMedication: (id: string) => void;
  onSaveDoctor: (doc: DoctorContact) => void;
  onDeleteDoctor: (id: string) => void;
  onBookAppointment: (apt: Omit<Appointment, 'id' | 'createdAtMillis'>) => void;
  onUpdateAppointmentStatus: (id: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED') => void;
  onDeleteAppointment: (id: string) => void;
}

export const HealthScreen: React.FC<HealthScreenProps> = ({
  medications,
  doseEvents,
  refillInventories,
  vitalSigns,
  doctors,
  appointments,
  onLogDose,
  onUpdateRefill,
  onSaveRefill,
  onDeleteRefill,
  onLogVital,
  onAddMedication,
  onDeleteMedication,
  onSaveDoctor,
  onDeleteDoctor,
  onBookAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'regimen' | 'doctors' | 'vitals' | 'briefing' | 'safety'>('schedule');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showAddMedModal, setShowAddMedModal] = useState(false);

  // Refill Inventory Modals
  const [editingRefill, setEditingRefill] = useState<RefillInventory | null>(null);
  const [showAddRefillModal, setShowAddRefillModal] = useState(false);

  // Doctors Modals
  const [editingDoctor, setEditingDoctor] = useState<DoctorContact | null>(null);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);

  // Appointment Booking Modal
  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [aptDate, setAptDate] = useState<string>(getTodayDateString());
  const [aptTime, setAptTime] = useState<string>('10:30');
  const [aptReason, setAptReason] = useState<string>('Medication Review & Follow-up');
  const [aptNotes, setAptNotes] = useState<string>('');

  // Vitals Form State
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [heartRate, setHeartRate] = useState<string>('72');
  const [weight, setWeight] = useState<string>('70');
  const [dizziness, setDizziness] = useState<number>(1);
  const [sedation, setSedation] = useState<number>(1);
  const [symptomsNote, setSymptomsNote] = useState<string>('');
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // New Medication Form State
  const [newGenericName, setNewGenericName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newStrength, setNewStrength] = useState('50');
  const [newUnit, setNewUnit] = useState('mg');
  const [newForm, setNewForm] = useState('tablet');
  const [newInstructions, setNewInstructions] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newDoctor, setNewDoctor] = useState('Dr Devendra Ratnani');

  // New Refill Form State
  const [newRefillMedName, setNewRefillMedName] = useState('');
  const [newRefillPurchaseDate, setNewRefillPurchaseDate] = useState(getTodayDateString());
  const [newRefillDaysSupplied, setNewRefillDaysSupplied] = useState('30');
  const [newRefillMorning, setNewRefillMorning] = useState(true);
  const [newRefillAfternoon, setNewRefillAfternoon] = useState(false);
  const [newRefillNight, setNewRefillNight] = useState(false);
  const [newRefillUnit, setNewRefillUnit] = useState('tablets');
  const [newRefillPharmacy, setNewRefillPharmacy] = useState('CVS Pharmacy #4821');
  const [newRefillPhone, setNewRefillPhone] = useState('(555) 019-2831');

  // New Doctor Form State
  const [newDocName, setNewDocName] = useState('Dr Devendra Ratnani');
  const [newDocSpecialty, setNewDocSpecialty] = useState('Neuropsychiatry & Mind Care Specialist');
  const [newDocClinic, setNewDocClinic] = useState('Ratnani Mind & Care Clinic');
  const [newDocPhone, setNewDocPhone] = useState('+91 98260 12345');
  const [newDocEmergency, setNewDocEmergency] = useState('+91 98260 99999');
  const [newDocEmail, setNewDocEmail] = useState('dr.ratnani@ratnaniclinic.org');
  const [newDocAddress, setNewDocAddress] = useState('Suite 402, Healthcare Complex');

  const todayStr = getTodayDateString();

  // Primary Doctor (default: Dr Devendra Ratnani)
  const primaryDoctor = doctors.find((d) => d.name.toLowerCase().includes('ratnani')) || doctors[0] || {
    id: 'doc_ratnani',
    name: 'Dr Devendra Ratnani',
    specialty: 'Neuropsychiatry & Mind Care Specialist',
    clinicName: 'Ratnani Mind & Care Clinic',
    phone: '+91 98260 12345',
    emergencyPhone: '+91 98260 99999',
    email: 'dr.ratnani@ratnaniclinic.org',
    address: 'Suite 402, Medical Enclave',
  };

  // Stats
  const takenCount = doseEvents.filter((d) => d.status === 'TAKEN' || d.status === 'TAKEN_LATE').length;
  const totalCount = doseEvents.length;
  const adherencePercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  const lowSupplyRefills = refillInventories.filter(
    (r) => r.quantityRemaining / (r.dailyBurnRate || 1) <= r.minimumThresholdDays
  );

  const latestVital = vitalSigns.length > 0 ? vitalSigns[0] : null;

  const handleSaveVitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogVital({
      systolicBp: parseInt(systolic) || undefined,
      diastolicBp: parseInt(diastolic) || undefined,
      restingHeartRate: parseInt(heartRate) || undefined,
      weightKg: parseFloat(weight) || undefined,
      dizzinessSeverity: dizziness,
      sedationSeverity: sedation,
      symptoms: symptomsNote || undefined,
    });
    setSymptomsNote('');
  };

  const handleCreateMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenericName.trim()) return;
    const medId = `med_${Date.now()}`;
    const newMed: Medication = {
      id: medId,
      genericName: newGenericName,
      brandName: newBrandName || newGenericName,
      dosageStrength: parseFloat(newStrength) || 10,
      dosageUnit: newUnit,
      form: newForm,
      route: 'oral',
      status: 'active',
      instructions: newInstructions || `Take 1 ${newForm} daily.`,
      scheduleTimes: [newTime],
      createdAtMillis: Date.now(),
      prescribingDoctor: newDoctor || 'Dr Devendra Ratnani',
    };
    onAddMedication(newMed);

    // Also auto-add an inventory item to Refill Vault
    onSaveRefill({
      id: `refill_${Date.now()}`,
      medicationId: medId,
      medicationName: `${newGenericName} ${newStrength} ${newUnit}`,
      quantityRemaining: 30,
      unit: newForm === 'capsule' ? 'capsules' : 'tablets',
      dailyBurnRate: 1,
      minimumThresholdDays: 7,
      pharmacyName: 'CVS Pharmacy',
      pharmacyPhone: '(555) 019-2831',
      refillsRemaining: 3,
      lastRefillDateString: todayStr,
    });

    setShowAddMedModal(false);
    setNewGenericName('');
    setNewBrandName('');
  };

  const handleCreateRefillItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefillMedName.trim()) return;

    const slots: ('Morning' | 'Afternoon' | 'Night')[] = [];
    if (newRefillMorning) slots.push('Morning');
    if (newRefillAfternoon) slots.push('Afternoon');
    if (newRefillNight) slots.push('Night');
    if (slots.length === 0) slots.push('Morning');

    const dosesPerDay = slots.length;
    const daysSupplied = parseInt(newRefillDaysSupplied) || 30;
    const totalQty = daysSupplied * dosesPerDay;

    const purchaseDate = new Date(newRefillPurchaseDate || todayStr);
    const currentDate = new Date(todayStr);
    const diffTime = Math.max(0, currentDate.getTime() - purchaseDate.getTime());
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const formulaRemaining = Math.max(0, totalQty - (daysElapsed * dosesPerDay));

    onSaveRefill({
      id: `refill_${Date.now()}`,
      medicationId: `med_custom_${Date.now()}`,
      medicationName: newRefillMedName,
      quantityRemaining: formulaRemaining,
      unit: newRefillUnit || 'tablets',
      dailyBurnRate: dosesPerDay,
      minimumThresholdDays: 7,
      pharmacyName: newRefillPharmacy || 'CVS Pharmacy #4821',
      pharmacyPhone: newRefillPhone || '(555) 019-2831',
      refillsRemaining: 3,
      lastRefillDateString: newRefillPurchaseDate,
      purchaseDateString: newRefillPurchaseDate,
      daysSupplied: daysSupplied,
      dosesPerDay: dosesPerDay,
      timingSlots: slots,
    });

    setShowAddRefillModal(false);
    setNewRefillMedName('');
  };

  const handleSaveEditedRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRefill) {
      const slots: ('Morning' | 'Afternoon' | 'Night')[] = editingRefill.timingSlots && editingRefill.timingSlots.length > 0
        ? (editingRefill.timingSlots as ('Morning' | 'Afternoon' | 'Night')[])
        : ['Morning'];
      const dosesPerDay = editingRefill.dosesPerDay || slots.length || 1;
      onSaveRefill({
        ...editingRefill,
        dailyBurnRate: dosesPerDay,
        dosesPerDay,
        timingSlots: slots,
      });
      setEditingRefill(null);
    }
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    onSaveDoctor({
      id: `doc_${Date.now()}`,
      name: newDocName,
      specialty: newDocSpecialty || 'Specialist',
      clinicName: newDocClinic || 'Medical Center',
      phone: newDocPhone || '+91 98260 12345',
      emergencyPhone: newDocEmergency || '+91 98260 99999',
      email: newDocEmail,
      address: newDocAddress,
    });
    setShowAddDoctorModal(false);
  };

  const handleSaveEditedDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDoctor) {
      onSaveDoctor(editingDoctor);
      setEditingDoctor(null);
    }
  };

  const handleBookAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctors.find((d) => d.id === selectedDoctorId) || primaryDoctor;
    onBookAppointment({
      doctorId: doc.id,
      doctorName: doc.name,
      scheduledTimeMillis: new Date(`${aptDate}T${aptTime}`).getTime() || Date.now() + 86400000,
      scheduledDateString: aptDate,
      scheduledTimeString: aptTime,
      reason: aptReason,
      status: 'SCHEDULED',
      notes: aptNotes,
    });
    setShowBookAppointmentModal(false);
    setAptNotes('');
  };

  const doctorBriefingText = `
================================================================================
                    PAIOS CLINICAL VISIT BRIEFING DOCUMENT
Generated: ${new Date().toLocaleString()} | Patient Profile: Alex
Primary Physician: ${primaryDoctor.name} (${primaryDoctor.specialty})
Clinic: ${primaryDoctor.clinicName} | Emergency Direct: ${primaryDoctor.emergencyPhone}
================================================================================
1. ACTIVE MEDICATIONS (RECORDED REGIMEN)
${medications.map((m) => `  • ${m.genericName} (${m.brandName}) ${m.dosageStrength}${m.dosageUnit} - ${m.instructions} [RxNorm CUI: ${m.rxNormCui || 'N/A'}] (Dr: ${m.prescribingDoctor || primaryDoctor.name})`).join('\n')}

2. ADHERENCE SUMMARY (TODAY & RECENT)
  • Adherence Score: ${adherencePercent}% (${takenCount}/${totalCount} doses recorded today)
  • Logged Doses Today (${todayStr}):
${doseEvents.map((d) => `    - [${d.scheduledTime}] ${d.medicationName}: ${d.status}`).join('\n')}

3. PATIENT-REPORTED SYMPTOMS & VITALS TELEMETRY
  • Latest Vitals: ${latestVital ? `BP: ${latestVital.systolicBp || '--'}/${latestVital.diastolicBp || '--'} mmHg | Resting HR: ${latestVital.restingHeartRate || '--'} bpm | Weight: ${latestVital.weightKg || '--'} kg` : 'None logged today.'}
  • Dizziness Severity: ${latestVital?.dizzinessSeverity ? `${latestVital.dizzinessSeverity}/10` : 'None'}
  • Recent Symptoms: ${latestVital?.symptoms || 'No acute side effects reported.'}

4. PHARMACY REFILL INVENTORY ALERTS
${lowSupplyRefills.map((r) => `  ⚠️ ${r.medicationName}: Only ${r.quantityRemaining} ${r.unit} left (${r.pharmacyName || 'Pharmacy'}).`).join('\n') || '  • All medication supplies are adequate.'}

5. PATIENT PREPARED DISCUSSION POINTS
  • Discuss morning alertness and whether evening dose timing should be adjusted.
  • Review potential multi-agent serotonergic / anticholinergic overlaps with ${primaryDoctor.name}.
================================================================================
NOTICE: Generated automatically by PAIOS for patient-clinician discussion.
================================================================================
  `.trim();

  const handleCopyBriefing = () => {
    navigator.clipboard.writeText(doctorBriefingText);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6">
      {/* Top Banner / Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <HeartPulse className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Health & Medication Engine</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Local-First
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Primary Physician: <strong className="text-emerald-300">{primaryDoctor.name}</strong> • RxNorm Grounded Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Doctor Emergency Phone Call Tag */}
          <a
            href={`tel:${primaryDoctor.emergencyPhone.replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl transition-all shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Dr. Emergency: {primaryDoctor.emergencyPhone}</span>
          </a>

          <button
            onClick={() => {
              setSelectedDoctorId(primaryDoctor.id);
              setShowBookAppointmentModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-sm"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>

          <button
            onClick={() => setShowEmergencyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-xl transition-all shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Red-Flag Safety</span>
          </button>

          <button
            onClick={() => setShowAddMedModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Med</span>
          </button>
        </div>
      </div>

      {/* Critical Refill Warning Banner (If Low Supply) */}
      {lowSupplyRefills.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm space-y-1">
            <span className="font-semibold text-amber-300">Medication Refill Warning:</span>
            <div className="text-slate-300">
              {lowSupplyRefills.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-amber-500/20 last:border-0 gap-2">
                  <span>
                    <strong>{r.medicationName}</strong> — Only <span className="font-bold text-amber-300">{r.quantityRemaining} {r.unit}</span> left ({Math.max(1, Math.floor(r.quantityRemaining / (r.dailyBurnRate || 1)))} days supply)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateRefill(r.id, r.quantityRemaining + 30)}
                      className="px-2.5 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg border border-amber-500/40"
                    >
                      + Quick Refill 30
                    </button>
                    <button
                      onClick={() => setEditingRefill(r)}
                      className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 rounded-lg"
                    >
                      Edit Supply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Adherence</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{adherencePercent}%</div>
          <div className="text-xs text-slate-500">{takenCount} of {totalCount} doses recorded</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Regimen</span>
            <Pill className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{medications.filter((m) => m.status === 'active').length}</div>
          <div className="text-xs text-slate-500">RxNorm Grounded Regimen</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Supply Vault</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {lowSupplyRefills.length > 0 ? (
              <span className="text-amber-400">{lowSupplyRefills.length} Low</span>
            ) : (
              <span className="text-emerald-400">OK</span>
            )}
          </div>
          <div className="text-xs text-slate-500">{refillInventories.length} Medications Tracked</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Primary Physician</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">{primaryDoctor.name}</div>
          <div className="text-xs text-emerald-400 truncate">{primaryDoctor.specialty.split('&')[0]}</div>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'schedule'
              ? 'bg-slate-800 text-emerald-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Schedule Ledger</span>
        </button>

        <button
          onClick={() => setActiveSubTab('regimen')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'regimen'
              ? 'bg-slate-800 text-indigo-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Regimen & Refill Vault</span>
        </button>

        <button
          onClick={() => setActiveSubTab('doctors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'doctors'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Doctors & Appointments ({appointments.filter(a => a.status === 'SCHEDULED').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vitals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'vitals'
              ? 'bg-slate-800 text-rose-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Vitals & Symptom Logger</span>
        </button>

        <button
          onClick={() => setActiveSubTab('briefing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'briefing'
              ? 'bg-slate-800 text-purple-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Doctor Visit Briefing</span>
        </button>

        <button
          onClick={() => setActiveSubTab('safety')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'safety'
              ? 'bg-slate-800 text-amber-400 font-semibold shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Drug Safety Review</span>
        </button>
      </div>

      {/* SUB-TAB 1: Today's Schedule & Dose Ledger */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Medication Schedule for Today ({todayStr})</span>
            </h2>
            <span className="text-xs text-slate-400">Deterministic Adherence Ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doseEvents.map((dose) => {
              const med = medications.find((m) => m.id === dose.medicationId);
              const refill = refillInventories.find((r) => r.medicationId === dose.medicationId);

              return (
                <div
                  key={dose.id}
                  className={`border rounded-2xl p-4 transition-all space-y-3 ${
                    dose.status === 'TAKEN' || dose.status === 'TAKEN_LATE'
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : dose.status === 'SKIPPED'
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono rounded-lg bg-slate-800 text-emerald-300 font-semibold">
                          {dose.scheduledTime}
                        </span>
                        <h3 className="text-sm font-bold text-white">{dose.medicationName}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{med?.instructions || 'Take as prescribed.'}</p>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        dose.status === 'TAKEN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : dose.status === 'TAKEN_LATE'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : dose.status === 'SKIPPED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {dose.status}
                    </span>
                  </div>

                  {/* Metadata Indicators */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="text-slate-300">Doctor: {med?.prescribingDoctor || primaryDoctor.name}</span>
                    {refill && (
                      <span className={refill.quantityRemaining <= 7 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        Supply: {refill.quantityRemaining} {refill.unit} left
                      </span>
                    )}
                  </div>

                  {/* Interactive Dose Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onLogDose(dose.id, 'TAKEN')}
                      className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
                        dose.status === 'TAKEN'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Take Dose</span>
                    </button>

                    <button
                      onClick={() => onLogDose(dose.id, 'SKIPPED')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
                        dose.status === 'SKIPPED'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Skip</span>
                    </button>

                    <button
                      onClick={() => onLogDose(dose.id, 'TAKEN_LATE')}
                      className="py-1.5 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                    >
                      Taken Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Active Regimen & Refill Inventory Vault */}
      {activeSubTab === 'regimen' && (
        <div className="space-y-6">
          {/* Active Regimen List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-400" />
                <span>Active Prescriptions & Regimen Details</span>
              </h2>
              <button
                onClick={() => setShowAddMedModal(true)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Prescribed Medication</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med) => {
                return (
                  <div key={med.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3 relative group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{med.genericName}</h3>
                          <span className="text-xs text-slate-400">({med.brandName})</span>
                        </div>
                        <p className="text-xs font-mono text-indigo-300 mt-0.5">
                          {med.dosageStrength} {med.dosageUnit} • {med.form} • Oral
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          RxCUI: {med.rxNormCui || '284205'}
                        </span>
                        <button
                          onClick={() => onDeleteMedication(med.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Delete Medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                      <strong>Instructions:</strong> {med.instructions}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>Doctor: <strong className="text-slate-200">{med.prescribingDoctor || primaryDoctor.name}</strong></span>
                      <span className="text-emerald-400 font-medium">Daily: {med.scheduleTimes.join(', ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refill Inventory Vault (Fully Editable / Modifiable) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Refill Vault & Pharmacy Supply Inventory</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Edit, increase, decrease, or remove medication stock amounts in real-time
                </p>
              </div>

              <button
                onClick={() => setShowAddRefillModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold rounded-xl self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Supply Item</span>
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Medication & Purchase Info</th>
                      <th className="px-4 py-3">Frequency & Timing</th>
                      <th className="px-4 py-3">Calculated vs. Active Stock</th>
                      <th className="px-4 py-3">Stock Adjustments</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {refillInventories.map((refill) => {
                      const calc = calcRefillStockDetails(refill, todayStr);
                      const daysLeftActual = Math.floor(refill.quantityRemaining / calc.dosesPerDay);
                      const isLow = daysLeftActual <= refill.minimumThresholdDays;

                      return (
                        <tr key={refill.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Medication & Purchase Info */}
                          <td className="px-4 py-3 font-medium text-white">
                            <div className="font-bold text-sm text-slate-100">{refill.medicationName}</div>
                            <div className="text-xs text-slate-400 mt-1 space-y-0.5 font-mono">
                              <div>
                                Bought: <span className="text-cyan-300 font-semibold">{calc.purchaseDateStr}</span> ({calc.daysElapsed}d ago)
                              </div>
                              <div>
                                Supplied: <span className="text-slate-300">{calc.daysSupplied} days</span> ({calc.totalBought} {refill.unit})
                              </div>
                            </div>
                          </td>

                          {/* Schedule Timing & Dose Frequency */}
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-indigo-300 mb-1">
                              {calc.dosesPerDay} time{calc.dosesPerDay > 1 ? 's' : ''} daily ({calc.dosesPerDay}x/day)
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {calc.timingSlots.map((slot) => (
                                <span
                                  key={slot}
                                  className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${
                                    slot === 'Morning'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : slot === 'Afternoon'
                                      ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                      : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  }`}
                                >
                                  {slot === 'Morning' ? '🌅 Morning' : slot === 'Afternoon' ? '☀️ Afternoon' : '🌙 Night'}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Remaining Supply Indicator */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-base font-bold ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {refill.quantityRemaining}
                                </span>
                                <span className="text-xs text-slate-400">{refill.unit}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isLow ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {daysLeftActual}d left
                                </span>
                              </div>

                              {/* Formula Auto-Calculated Comparison */}
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                                <span>Formula Calc: <strong className="text-slate-200">{calc.formulaRemaining}</strong> {refill.unit}</span>
                                {calc.isManuallyAdjusted ? (
                                  <button
                                    onClick={() => onUpdateRefill(refill.id, calc.formulaRemaining)}
                                    className="px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/30 text-[10px] transition-colors"
                                    title="Sync active stock to formula calculated amount"
                                  >
                                    Reset to Calc
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-emerald-400/90 font-sans">✓ Synced</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Increase / Decrease Stock Adjustments */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onUpdateRefill(refill.id, Math.max(0, refill.quantityRemaining - 10))}
                                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
                                title="Decrease by 10"
                              >
                                -10
                              </button>
                              <button
                                onClick={() => onUpdateRefill(refill.id, Math.max(0, refill.quantityRemaining - 1))}
                                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
                                title="Decrease by 1"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => onUpdateRefill(refill.id, refill.quantityRemaining + 1)}
                                className="px-2 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-mono border border-emerald-500/20"
                                title="Increase by 1"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => onUpdateRefill(refill.id, refill.quantityRemaining + 10)}
                                className="px-2 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-mono border border-emerald-500/20"
                                title="Increase by 10"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => onUpdateRefill(refill.id, refill.quantityRemaining + 30)}
                                className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono font-bold"
                                title="Increase by 30"
                              >
                                +30
                              </button>
                            </div>
                          </td>

                          {/* Edit / Delete Actions */}
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => setEditingRefill(refill)}
                              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => onDeleteRefill(refill.id)}
                              className="px-2.5 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 inline-flex items-center gap-1"
                              title="Delete Refill Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Doctors Directory & Appointment Booking */}
      {activeSubTab === 'doctors' && (
        <div className="space-y-6">
          {/* Prescribing Physician Card Banner (Featured Dr Devendra Ratnani) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xl shrink-0">
                  DR
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{primaryDoctor.name}</h2>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      Primary Clinician
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{primaryDoctor.specialty} • {primaryDoctor.clinicName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingDoctor(primaryDoctor)}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Doctor Info</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedDoctorId(primaryDoctor.id);
                    setShowBookAppointmentModal(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Book Appointment</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">CLINIC PHONE</span>
                  <a href={`tel:${primaryDoctor.phone}`} className="hover:underline font-mono font-medium">{primaryDoctor.phone}</a>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-amber-400 block text-[10px] font-bold">EMERGENCY DIRECT NUMBER</span>
                  <a href={`tel:${primaryDoctor.emergencyPhone}`} className="hover:underline font-mono font-bold text-amber-300">
                    {primaryDoctor.emergencyPhone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">ADDRESS / LOCATION</span>
                  <span className="truncate block text-slate-300">{primaryDoctor.address || 'Medical Enclave'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* All Doctors List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Saved Healthcare Specialists Directory</span>
              </h3>

              <button
                onClick={() => setShowAddDoctorModal(true)}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Doctor</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <div key={doc.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{doc.name}</h4>
                      <p className="text-xs text-slate-400">{doc.specialty}</p>
                      <p className="text-xs text-slate-500">{doc.clinicName}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingDoctor(doc)}
                        className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800"
                        title="Edit Doctor Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteDoctor(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded bg-slate-800"
                        title="Delete Doctor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span>{doc.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400 font-semibold">Emergency Direct:</span>
                      <span className="text-amber-300 font-bold">{doc.emergencyPhone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-400 truncate">{doc.email || 'N/A'}</span>
                    <button
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setShowBookAppointmentModal(true);
                      }}
                      className="px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg font-semibold border border-cyan-500/30"
                    >
                      Book Consultation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Appointments Management List */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Scheduled Clinical Appointments</span>
              </h3>

              <button
                onClick={() => {
                  setSelectedDoctorId(primaryDoctor.id);
                  setShowBookAppointmentModal(true);
                }}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New Appointment</span>
              </button>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No upcoming clinic appointments scheduled.</p>
                </div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-semibold">
                          {apt.scheduledDateString} at {apt.scheduledTimeString}
                        </span>
                        <h4 className="text-sm font-bold text-white">{apt.doctorName}</h4>
                      </div>
                      <p className="text-xs text-slate-300"><strong>Reason:</strong> {apt.reason}</p>
                      {apt.notes && <p className="text-xs text-slate-500 italic">"{apt.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          apt.status === 'SCHEDULED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : apt.status === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {apt.status}
                      </span>

                      {apt.status === 'SCHEDULED' && (
                        <button
                          onClick={() => onUpdateAppointmentStatus(apt.id, 'COMPLETED')}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg font-medium"
                        >
                          Complete
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteAppointment(apt.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg"
                        title="Delete Appointment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Vitals & Symptom Logger */}
      {activeSubTab === 'vitals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logger Form */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Log Vitals & Side Effect Telemetry</span>
            </h2>

            <form onSubmit={handleSaveVitalSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Resting Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="70.5"
                  />
                </div>
              </div>

              {/* Dizziness & Sedation Severity Sliders */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Dizziness Severity Score</span>
                    <span className="font-bold text-cyan-400">{dizziness}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={dizziness}
                    onChange={(e) => setDizziness(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Daytime Sedation Score</span>
                    <span className="font-bold text-indigo-400">{sedation}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sedation}
                    onChange={(e) => setSedation(parseInt(e.target.value))}
                    className="w-full accent-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Symptom Notes & Context</label>
                <textarea
                  rows={2}
                  value={symptomsNote}
                  onChange={(e) => setSymptomsNote(e.target.value)}
                  placeholder="e.g. Felt lightheaded for 10 mins after morning Propranolol dose."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-md transition-all"
              >
                Log Vital & Symptom Record
              </button>
            </form>
          </div>

          {/* Historical Telemetry List */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Recent Vitals & Symptom Logs</span>
            </h2>

            <div className="space-y-3">
              {vitalSigns.map((v) => (
                <div key={v.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {new Date(v.timestampMillis).toLocaleDateString()} at{' '}
                      {new Date(v.timestampMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                        BP: {v.systolicBp || '--'}/{v.diastolicBp || '--'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                        HR: {v.restingHeartRate || '--'} bpm
                      </span>
                    </div>
                  </div>

                  {v.symptoms && <p className="text-xs text-slate-200">"{v.symptoms}"</p>}

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Dizziness: {v.dizzinessSeverity || 0}/10</span>
                    <span>Sedation: {v.sedationSeverity || 0}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Doctor Visit Briefing */}
      {activeSubTab === 'briefing' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Clinical Visit Briefing Document</h2>
            </div>

            <button
              onClick={handleCopyBriefing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl shadow transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedBriefing ? 'Copied Briefing!' : 'Copy Clinical Briefing'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {doctorBriefingText}
          </pre>
        </div>
      )}

      {/* SUB-TAB 6: Drug Safety Review */}
      {activeSubTab === 'safety' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pharmacological Reference Review</h2>
              <p className="text-xs text-slate-400">
                Structured clinical discussion questions for doctor or pharmacist consultation
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                1. Serotonergic Overlap (Sertraline 50 mg + Clomipramine 25 mg)
              </h3>
              <p className="text-slate-400">
                Co-administration of an SSRI and a TCA involves dual serotonergic uptake inhibition. Discuss with {primaryDoctor.name} monitoring for early signs of Serotonin Toxicity (e.g. tremor, hyperreflexia, sweating).
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                2. Additive CNS & Sedation (Quetiapine + Clonazepam + Clomipramine)
              </h3>
              <p className="text-slate-400">
                Three evening agents exhibit sedating properties. Track morning grogginess and avoid driving if daytime sedation occurs.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                3. Hemodynamic & Heart Rate Aspects (Propranolol + Quetiapine)
              </h3>
              <p className="text-slate-400">
                Propranolol reduces heart rate; quetiapine can induce mild orthostatic blood pressure drops upon standing. Log morning blood pressure and heart rate regularly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Red-Flag Modal Overlay */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Emergency Red-Flag Safety Protocol</h2>
                <p className="text-xs text-red-300">Level 5 Hard Stop Medical Override</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If you or someone nearby is experiencing any of the following symptoms, call emergency services or your doctor immediately:
            </p>

            <ul className="text-xs text-slate-200 space-y-1.5 list-disc list-inside bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono">
              <li>Crushing chest pain or pressure radiating to arm/jaw</li>
              <li>Sudden shortness of breath or throat closing (Anaphylaxis)</li>
              <li>Slurred speech, facial drooping, or sudden weakness</li>
              <li>Severe disorientation, hyperthermia, or uncontrollable tremors</li>
            </ul>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-amber-300">Doctor Emergency Direct Line:</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-200">{primaryDoctor.name} ({primaryDoctor.specialty.split('&')[0]})</span>
                <a href={`tel:${primaryDoctor.emergencyPhone}`} className="font-mono font-bold text-amber-400 hover:underline">
                  {primaryDoctor.emergencyPhone}
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href={`tel:${primaryDoctor.emergencyPhone.replace(/\s+/g, '')}`}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg text-center"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Dr. Emergency ({primaryDoctor.emergencyPhone})</span>
              </a>

              <a
                href="tel:911"
                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg text-center"
              >
                <span>Call 911</span>
              </a>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-400" />
              <span>Add New Prescribed Medication</span>
            </h2>

            <form onSubmit={handleCreateMedication} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Generic Name *</label>
                <input
                  type="text"
                  required
                  value={newGenericName}
                  onChange={(e) => setNewGenericName(e.target.value)}
                  placeholder="e.g. Sertraline HCl"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Zoloft"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Strength</label>
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder="50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Prescribing Doctor</label>
                <select
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Instructions</label>
                <input
                  type="text"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Take 1 tablet every morning with food"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
                >
                  Save Medication
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Refill Modal */}
      {editingRefill && (() => {
        const editCalc = calcRefillStockDetails(editingRefill, todayStr);

        const handleToggleSlot = (slot: 'Morning' | 'Afternoon' | 'Night') => {
          const currentSlots: ('Morning' | 'Afternoon' | 'Night')[] =
            editingRefill.timingSlots && editingRefill.timingSlots.length > 0
              ? (editingRefill.timingSlots as ('Morning' | 'Afternoon' | 'Night')[])
              : ['Morning'];

          let newSlots: ('Morning' | 'Afternoon' | 'Night')[];
          if (currentSlots.includes(slot)) {
            newSlots = currentSlots.filter(s => s !== slot);
            if (newSlots.length === 0) newSlots = ['Morning'];
          } else {
            newSlots = [...currentSlots, slot];
          }

          const newDosesPerDay = newSlots.length;
          setEditingRefill({
            ...editingRefill,
            timingSlots: newSlots,
            dosesPerDay: newDosesPerDay,
            dailyBurnRate: newDosesPerDay,
          });
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <span>Edit Supply & Prescription Details</span>
              </h2>

              <form onSubmit={handleSaveEditedRefill} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={editingRefill.medicationName}
                    onChange={(e) => setEditingRefill({ ...editingRefill, medicationName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Prescription Purchase Date</label>
                    <input
                      type="date"
                      required
                      value={editingRefill.purchaseDateString || editingRefill.lastRefillDateString || '2026-08-01'}
                      onChange={(e) => setEditingRefill({
                        ...editingRefill,
                        purchaseDateString: e.target.value,
                        lastRefillDateString: e.target.value,
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Days Meds Supplied</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="365"
                      value={editingRefill.daysSupplied || 30}
                      onChange={(e) => setEditingRefill({
                        ...editingRefill,
                        daysSupplied: Math.max(1, parseInt(e.target.value) || 30),
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Timing & Dose Frequency Schedule */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Dose Timing / Schedule (Times Daily)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Morning', 'Afternoon', 'Night'] as const).map((slot) => {
                      const isChecked = (editingRefill.timingSlots || ['Morning']).includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleToggleSlot(slot)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isChecked
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs">{slot === 'Morning' ? '🌅 Morning' : slot === 'Afternoon' ? '☀️ Afternoon' : '🌙 Night'}</div>
                          <div className="text-[10px] opacity-75 font-mono">{slot === 'Morning' ? '08:00 AM' : slot === 'Afternoon' ? '01:00 PM' : '09:00 PM'}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Frequency: <strong className="text-amber-300">{editCalc.dosesPerDay} time{editCalc.dosesPerDay > 1 ? 's' : ''} per day</strong> ({editCalc.timingSlots.join(', ')})
                  </div>
                </div>

                {/* Formula Auto-Calculation Summary Box */}
                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 space-y-1.5 text-slate-300">
                  <div className="flex items-center justify-between font-semibold text-indigo-300 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Formula Auto-Calculation Engine</span>
                    </span>
                    <span className="text-[10px] font-mono bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">
                      {editCalc.daysElapsed} days elapsed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
                    <div>Total Supplied: <strong className="text-slate-200">{editCalc.totalBought} {editingRefill.unit}</strong></div>
                    <div>Doses Consumed: <strong className="text-slate-200">{editCalc.dosesConsumed} {editingRefill.unit}</strong></div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-800">
                    <span className="text-slate-200">Auto-Calculated Remaining:</span>
                    <span className="text-emerald-400 font-mono text-sm">{editCalc.formulaRemaining} {editingRefill.unit} ({editCalc.daysLeftFormula}d supply)</span>
                  </div>
                </div>

                {/* Active Stock & Adjustments */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Active In-Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingRefill.quantityRemaining}
                      onChange={(e) => setEditingRefill({ ...editingRefill, quantityRemaining: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-base font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Unit Type</label>
                    <input
                      type="text"
                      value={editingRefill.unit}
                      onChange={(e) => setEditingRefill({ ...editingRefill, unit: e.target.value })}
                      placeholder="tablets / capsules / mL"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Sync with Calculated Formula:</span>
                  <button
                    type="button"
                    onClick={() => setEditingRefill({ ...editingRefill, quantityRemaining: editCalc.formulaRemaining })}
                    className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg"
                  >
                    Set to {editCalc.formulaRemaining} {editingRefill.unit}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Low Supply Threshold (Days)</label>
                    <input
                      type="number"
                      value={editingRefill.minimumThresholdDays}
                      onChange={(e) => setEditingRefill({ ...editingRefill, minimumThresholdDays: parseInt(e.target.value) || 7 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      value={editingRefill.pharmacyName || ''}
                      onChange={(e) => setEditingRefill({ ...editingRefill, pharmacyName: e.target.value })}
                      placeholder="e.g. CVS Pharmacy"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    Save Stock & Schedule Updates
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRefill(null)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Add Supply Refill Modal */}
      {showAddRefillModal && (() => {
        const slots: ('Morning' | 'Afternoon' | 'Night')[] = [];
        if (newRefillMorning) slots.push('Morning');
        if (newRefillAfternoon) slots.push('Afternoon');
        if (newRefillNight) slots.push('Night');
        if (slots.length === 0) slots.push('Morning');

        const dosesPerDay = slots.length;
        const daysSupplied = parseInt(newRefillDaysSupplied) || 30;
        const totalBought = daysSupplied * dosesPerDay;

        const purchaseDate = new Date(newRefillPurchaseDate || todayStr);
        const currentDate = new Date(todayStr);
        const diffTime = Math.max(0, currentDate.getTime() - purchaseDate.getTime());
        const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const formulaRemaining = Math.max(0, totalBought - (daysElapsed * dosesPerDay));

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>Add Supply Item to Refill Vault</span>
              </h2>

              <form onSubmit={handleCreateRefillItem} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Medication Name & Strength *</label>
                  <input
                    type="text"
                    required
                    value={newRefillMedName}
                    onChange={(e) => setNewRefillMedName(e.target.value)}
                    placeholder="e.g. Sertraline HCl 50 mg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Prescription Purchase Date</label>
                    <input
                      type="date"
                      required
                      value={newRefillPurchaseDate}
                      onChange={(e) => setNewRefillPurchaseDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Days Meds Supplied</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="365"
                      value={newRefillDaysSupplied}
                      onChange={(e) => setNewRefillDaysSupplied(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Timing Checkboxes */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    How many times / when to take meds:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRefillMorning(!newRefillMorning)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        newRefillMorning
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">🌅 Morning</div>
                      <div className="text-[10px] opacity-75 font-mono">08:00 AM</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRefillAfternoon(!newRefillAfternoon)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        newRefillAfternoon
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">☀️ Afternoon</div>
                      <div className="text-[10px] opacity-75 font-mono">01:00 PM</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRefillNight(!newRefillNight)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        newRefillNight
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">🌙 Night</div>
                      <div className="text-[10px] opacity-75 font-mono">09:00 PM</div>
                    </button>
                  </div>
                </div>

                {/* Auto Calculated Summary Preview */}
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-1.5 text-slate-300">
                  <div className="flex items-center justify-between font-semibold text-amber-300 text-xs">
                    <span>Calculated Inventory Projection</span>
                    <span className="font-mono text-[10px]">{dosesPerDay} dose{dosesPerDay > 1 ? 's' : ''}/day</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div>Total Meds Supplied: <strong className="text-slate-200">{totalBought} {newRefillUnit}</strong></div>
                    <div>Days Elapsed: <strong className="text-slate-200">{daysElapsed} days</strong></div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-800">
                    <span>Initial Calculated Stock Left:</span>
                    <span className="text-emerald-400 font-mono text-sm">{formulaRemaining} {newRefillUnit}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Unit Type</label>
                    <input
                      type="text"
                      value={newRefillUnit}
                      onChange={(e) => setNewRefillUnit(e.target.value)}
                      placeholder="tablets"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      value={newRefillPharmacy}
                      onChange={(e) => setNewRefillPharmacy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Pharmacy Phone</label>
                  <input
                    type="text"
                    value={newRefillPhone}
                    onChange={(e) => setNewRefillPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    Add Supply Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRefillModal(false)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <span>Edit Doctor Information & Emergency Contact</span>
            </h2>

            <form onSubmit={handleSaveEditedDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={editingDoctor.name}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Specialty</label>
                <input
                  type="text"
                  value={editingDoctor.specialty}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, specialty: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinic / Hospital Name</label>
                <input
                  type="text"
                  value={editingDoctor.clinicName}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, clinicName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Clinic Phone</label>
                  <input
                    type="text"
                    value={editingDoctor.phone}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 font-bold mb-1">Emergency Direct Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingDoctor.emergencyPhone}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, emergencyPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinic Address</label>
                <input
                  type="text"
                  value={editingDoctor.address || ''}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl"
                >
                  Save Doctor Profile
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <span>Add Healthcare Specialist Contact</span>
            </h2>

            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Dr Devendra Ratnani"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Specialty</label>
                <input
                  type="text"
                  value={newDocSpecialty}
                  onChange={(e) => setNewDocSpecialty(e.target.value)}
                  placeholder="Neuropsychiatry & Mind Care Specialist"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinic Name</label>
                <input
                  type="text"
                  value={newDocClinic}
                  onChange={(e) => setNewDocClinic(e.target.value)}
                  placeholder="Ratnani Mind & Care Clinic"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Clinic Phone</label>
                  <input
                    type="text"
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    placeholder="+91 98260 12345"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 font-bold mb-1">Emergency Phone *</label>
                  <input
                    type="text"
                    required
                    value={newDocEmergency}
                    onChange={(e) => setNewDocEmergency(e.target.value)}
                    placeholder="+91 98260 99999"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl"
                >
                  Save Specialist
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-400" />
              <span>Book Appointment with Specialist</span>
            </h2>

            <form onSubmit={handleBookAppointmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Doctor</label>
                <select
                  value={selectedDoctorId || primaryDoctor.id}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    required
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Consultation Reason / Goal</label>
                <input
                  type="text"
                  required
                  value={aptReason}
                  onChange={(e) => setAptReason(e.target.value)}
                  placeholder="e.g. Routine Medication Review & Adherence Check"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Questions to Ask</label>
                <textarea
                  rows={2}
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  placeholder="e.g. Discuss morning alertness and refill stock."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow"
                >
                  Confirm Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookAppointmentModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
