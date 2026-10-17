import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  User,
  MapPin,
  Heart,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar,
  Building,
  Phone,
  BookmarkCheck,
  Pencil,
} from 'lucide-react';
import type { Student, ClassRoom, Gender } from '../types';
import {
  getAllProvinces,
  getDistrictsForProvince,
  getCommunesForDistrict,
  getVillagesForCommune,
} from '../utils/cambodiaGeography';
import { SearchableAdminInput } from './common/SearchableAdminInput';
import { formatToDMY } from '../utils/dateUtils';
import { calculateAge } from '../utils/excelUtils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  defaultClassId: string;
  onSave: (student: Student) => Promise<void>;
  nextRollNo: number;
  studentToEdit?: Student | null;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  onSave,
  nextRollNo,
  studentToEdit,
}) => {
  // All 25 provinces/capital of Cambodia
  const allProvinces = useMemo(() => getAllProvinces(), []);

  // Form State
  const [classId, setClassId] = useState(defaultClassId || (classes[0]?.id ?? ''));
  const [studentCode, setStudentCode] = useState('');
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [originSchool, setOriginSchool] = useState('វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច');
  const [studentPhone, setStudentPhone] = useState('');

  // Place of Birth (ទីកន្លែងកំណើត)
  const [pobProvince, setPobProvince] = useState('ខេត្តកំពង់ឆ្នាំង');
  const [pobDistrict, setPobDistrict] = useState('ស្រុកកំពង់ត្រឡាច');
  const [pobCommune, setPobCommune] = useState('ឃុំកំពង់ត្រឡាច');
  const [pobVillage, setPobVillage] = useState('');

  // Current Address (អាសយដ្ឋានបច្ចុប្បន្ន)
  const [addrProvince, setAddrProvince] = useState('ខេត្តកំពង់ឆ្នាំង');
  const [addrDistrict, setAddrDistrict] = useState('ស្រុកកំពង់ត្រឡាច');
  const [addrCommune, setAddrCommune] = useState('ឃុំកំពង់ត្រឡាច');
  const [addrVillage, setAddrVillage] = useState('');
  const [sameAsPob, setSameAsPob] = useState(false);

  // Student Status (ស្ថានភាពសិស្ស)
  const [orphanStatus, setOrphanStatus] = useState<'none' | 'father' | 'mother' | 'both'>('none');
  const [isDisabled, setIsDisabled] = useState(false);
  const [isPoor, setIsPoor] = useState(false);
  const [hasScholarship, setHasScholarship] = useState(false);
  const [stayInPagoda, setStayInPagoda] = useState(false);

  // Parent Info (ព័ត៌មានឪពុកម្តាយ)
  const [fatherName, setFatherName] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');

  const [motherName, setMotherName] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [motherPhone, setMotherPhone] = useState('');

  // Guardian Info (អាណាព្យាបាល)
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('ឪពុក');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // Notes
  const [otherNotes, setOtherNotes] = useState('');

  // Validation & Submitting state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset/Initialize on open
  useEffect(() => {
    if (isOpen) {
      if (studentToEdit) {
        setClassId(studentToEdit.classId || defaultClassId || (classes[0]?.id ?? ''));
        setStudentCode(studentToEdit.studentCode || '');
        setNameKh(studentToEdit.nameKh || '');
        setNameEn(studentToEdit.nameEn || '');
        setGender(studentToEdit.gender || 'ប្រុស');
        setDob(studentToEdit.dob || '');
        setOriginSchool(studentToEdit.originSchool || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច');
        setStudentPhone(studentToEdit.studentPhone || '');

        setPobProvince(studentToEdit.pobProvince || studentToEdit.pob || 'ខេត្តកំពង់ឆ្នាំង');
        setPobDistrict(studentToEdit.pobDistrict || 'ស្រុកកំពង់ត្រឡាច');
        setPobCommune(studentToEdit.pobCommune || 'ឃុំកំពង់ត្រឡាច');
        setPobVillage(studentToEdit.pobVillage || '');

        setAddrProvince(studentToEdit.addrProvince || studentToEdit.currentAddress || 'ខេត្តកំពង់ឆ្នាំង');
        setAddrDistrict(studentToEdit.addrDistrict || 'ស្រុកកំពង់ត្រឡាច');
        setAddrCommune(studentToEdit.addrCommune || 'ឃុំកំពង់ត្រឡាច');
        setAddrVillage(studentToEdit.addrVillage || '');
        setSameAsPob(false);

        setOrphanStatus(studentToEdit.orphanStatus || 'none');
        setIsDisabled(!!studentToEdit.isDisabled);
        setIsPoor(!!studentToEdit.isPoor);
        setHasScholarship(!!studentToEdit.hasScholarship);
        setStayInPagoda(!!studentToEdit.stayInPagoda);

        setFatherName(studentToEdit.fatherName || '');
        setFatherOccupation(studentToEdit.fatherOccupation || '');
        setFatherPhone(studentToEdit.fatherPhone || '');
        setMotherName(studentToEdit.motherName || '');
        setMotherOccupation(studentToEdit.motherOccupation || '');
        setMotherPhone(studentToEdit.motherPhone || '');
        setGuardianName(studentToEdit.guardianName || '');
        setGuardianRelationship(studentToEdit.guardianRelationship || 'ឪពុក');
        setGuardianOccupation(studentToEdit.guardianOccupation || '');
        setGuardianPhone(studentToEdit.guardianPhone || '');
        setOtherNotes(studentToEdit.otherNotes || studentToEdit.notes || '');
        setErrors({});
        setIsSubmitting(false);
      } else {
        const targetClass = defaultClassId !== 'ALL' ? defaultClassId : (classes[0]?.id ?? '');
        setClassId(targetClass);
        setStudentCode('');
        setNameKh('');
        setNameEn('');
        setGender('ប្រុស');
        setDob('');
        setOriginSchool('វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច');
        setStudentPhone('');

        // Default to Kampong Chhnang
        setPobProvince('ខេត្តកំពង់ឆ្នាំង');
        setPobDistrict('ស្រុកកំពង់ត្រឡាច');
        setPobCommune('ឃុំកំពង់ត្រឡាច');
        setPobVillage('');

        setAddrProvince('ខេត្តកំពង់ឆ្នាំង');
        setAddrDistrict('ស្រុកកំពង់ត្រឡាច');
        setAddrCommune('ឃុំកំពង់ត្រឡាច');
        setAddrVillage('');
        setSameAsPob(true);

        setOrphanStatus('none');
        setIsDisabled(false);
        setIsPoor(false);
        setHasScholarship(false);
        setStayInPagoda(false);

        setFatherName('');
        setFatherOccupation('');
        setFatherPhone('');
        setMotherName('');
        setMotherOccupation('');
        setMotherPhone('');
        setGuardianName('');
        setGuardianRelationship('ឪពុក');
        setGuardianOccupation('');
        setGuardianPhone('');
        setOtherNotes('');
        setErrors({});
        setIsSubmitting(false);
      }
    }
  }, [isOpen, defaultClassId, classes, studentToEdit]);

  // Sync POB to Addr if sameAsPob checked
  useEffect(() => {
    if (sameAsPob) {
      setAddrProvince(pobProvince);
      setAddrDistrict(pobDistrict);
      setAddrCommune(pobCommune);
      setAddrVillage(pobVillage);
    }
  }, [sameAsPob, pobProvince, pobDistrict, pobCommune, pobVillage]);

  // Cascading options for POB
  const pobDistricts = useMemo(() => getDistrictsForProvince(pobProvince), [pobProvince]);
  const pobCommunes = useMemo(
    () => getCommunesForDistrict(pobProvince, pobDistrict),
    [pobProvince, pobDistrict]
  );
  const pobVillages = useMemo(
    () => getVillagesForCommune(pobProvince, pobDistrict, pobCommune),
    [pobProvince, pobDistrict, pobCommune]
  );

  // Cascading options for Current Address
  const addrDistricts = useMemo(() => getDistrictsForProvince(addrProvince), [addrProvince]);
  const addrCommunes = useMemo(
    () => getCommunesForDistrict(addrProvince, addrDistrict),
    [addrProvince, addrDistrict]
  );
  const addrVillages = useMemo(
    () => getVillagesForCommune(addrProvince, addrDistrict, addrCommune),
    [addrProvince, addrDistrict, addrCommune]
  );

  // Handle cascading changes for POB
  const handlePobProvinceChange = (prov: string) => {
    setPobProvince(prov);
    const dists = getDistrictsForProvince(prov);
    const firstDist = dists[0] || '';
    setPobDistrict(firstDist);
    const comms = getCommunesForDistrict(prov, firstDist);
    const firstComm = comms[0] || '';
    setPobCommune(firstComm);
    const vills = getVillagesForCommune(prov, firstDist, firstComm);
    setPobVillage(vills[0] || '');
  };

  const handlePobDistrictChange = (dist: string) => {
    setPobDistrict(dist);
    const comms = getCommunesForDistrict(pobProvince, dist);
    const firstComm = comms[0] || '';
    setPobCommune(firstComm);
    const vills = getVillagesForCommune(pobProvince, dist, firstComm);
    setPobVillage(vills[0] || '');
  };

  const handlePobCommuneChange = (comm: string) => {
    setPobCommune(comm);
    const vills = getVillagesForCommune(pobProvince, pobDistrict, comm);
    setPobVillage(vills[0] || '');
  };

  // Handle cascading changes for Current Address
  const handleAddrProvinceChange = (prov: string) => {
    setAddrProvince(prov);
    const dists = getDistrictsForProvince(prov);
    const firstDist = dists[0] || '';
    setAddrDistrict(firstDist);
    const comms = getCommunesForDistrict(prov, firstDist);
    const firstComm = comms[0] || '';
    setAddrCommune(firstComm);
    const vills = getVillagesForCommune(prov, firstDist, firstComm);
    setAddrVillage(vills[0] || '');
  };

  const handleAddrDistrictChange = (dist: string) => {
    setAddrDistrict(dist);
    const comms = getCommunesForDistrict(addrProvince, dist);
    const firstComm = comms[0] || '';
    setAddrCommune(firstComm);
    const vills = getVillagesForCommune(addrProvince, dist, firstComm);
    setAddrVillage(vills[0] || '');
  };

  const handleAddrCommuneChange = (comm: string) => {
    setAddrCommune(comm);
    const vills = getVillagesForCommune(addrProvince, addrDistrict, comm);
    setAddrVillage(vills[0] || '');
  };

  // Helper to check if parent is deceased
  const isDeceased = (text: string) => {
    if (!text) return false;
    return /(ស្លាប់|មរណៈ|ទទួលមរណភាព)/i.test(text.trim());
  };

  // Auto-orphan logic when father's occupation changes
  const handleFatherOccupationChange = (val: string) => {
    setFatherOccupation(val);
    const fDead = isDeceased(val);
    const mDead = isDeceased(motherOccupation);
    if (fDead && mDead) {
      setOrphanStatus('both');
    } else if (fDead) {
      setOrphanStatus('father');
    } else if (mDead) {
      setOrphanStatus('mother');
    } else if (orphanStatus === 'father' || orphanStatus === 'both') {
      setOrphanStatus('none');
    }
  };

  // Auto-orphan logic when mother's occupation changes
  const handleMotherOccupationChange = (val: string) => {
    setMotherOccupation(val);
    const fDead = isDeceased(fatherOccupation);
    const mDead = isDeceased(val);
    if (fDead && mDead) {
      setOrphanStatus('both');
    } else if (fDead) {
      setOrphanStatus('father');
    } else if (mDead) {
      setOrphanStatus('mother');
    } else if (orphanStatus === 'mother' || orphanStatus === 'both') {
      setOrphanStatus('none');
    }
  };

  const COMMON_OCCUPATIONS = ['កសិករ', 'កម្មករ', 'មន្ត្រីរាជការ', 'អាជីវករ', 'គ្រូបង្រៀន', 'ស្លាប់'];

  // Form Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!nameKh.trim()) {
      newErrors.nameKh = 'សូមបញ្ចូលគោត្តនាម និងនាមសិស្ស (ចាំបាច់)';
    }

    if (!gender) {
      newErrors.gender = 'សូមជ្រើសរើសភេទ (ចាំបាច់)';
    }


    if (!classId) {
      newErrors.classId = 'សូមជ្រើសរើសថ្នាក់រៀន (ចាំបាច់)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedAge = dob ? calculateAge(dob) : undefined;
      const formatVillage = (v: string) => {
        if (!v) return '';
        const trimmed = v.trim();
        return trimmed.startsWith('ភូមិ') ? trimmed : `ភូមិ${trimmed}`;
      };
      const fullPob = [formatVillage(pobVillage), pobCommune, pobDistrict, pobProvince]
        .filter(Boolean)
        .join(' ');
      const fullAddr = [formatVillage(addrVillage), addrCommune, addrDistrict, addrProvince]
        .filter(Boolean)
        .join(' ');

      const studentData: Student = {
        ...(studentToEdit || {}),
        id: studentToEdit?.id || `stu-${Date.now()}`,
        classId,
        rollNo: studentToEdit?.rollNo || 1, // Keep existing rollNo if editing, otherwise row 1
        studentCode: studentCode.trim(),
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim(),
        gender,
        dob,
        age: calculatedAge,
        originSchool: originSchool.trim(),
        // POB
        pobProvince,
        pobDistrict,
        pobCommune,
        pobVillage: pobVillage.trim(),
        pob: fullPob,
        // Current Address
        addrProvince,
        addrDistrict,
        addrCommune,
        addrVillage: addrVillage.trim(),
        currentAddress: fullAddr,
        // Contact
        studentPhone: studentPhone.trim(),
        // Status
        orphanStatus,
        isDisabled,
        isPoor,
        hasScholarship,
        stayInPagoda,
        // Parents
        fatherName: fatherName.trim(),
        fatherOccupation: fatherOccupation.trim(),
        fatherPhone: fatherPhone.trim(),
        motherName: motherName.trim(),
        motherOccupation: motherOccupation.trim(),
        motherPhone: motherPhone.trim(),
        guardianName: guardianName.trim(),
        guardianRelationship: guardianRelationship.trim(),
        guardianOccupation: guardianOccupation.trim(),
        guardianPhone: guardianPhone.trim(),
        otherNotes: otherNotes.trim(),
        status: studentToEdit?.status || 'active',
        createdAt: studentToEdit?.createdAt || new Date().toISOString(),
      };

      await onSave(studentData);
      onClose();
    } catch (err) {
      console.error('Error saving student:', err);
      alert('មានបញ្ហាក្នុងការរក្សាទុកសិស្ស! សូមព្យាយាមម្តងទៀត។');
    } finally {
      setIsSubmitting(false);
    }
  };
  // Global shortcut listeners inside Modal (Ctrl+S / Cmd+S to save, Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [isOpen, handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 z-10 animate-scale-up flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#002060] via-[#0b3c7b] to-[#002060] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              {studentToEdit ? (
                <Pencil className="w-5 h-5 text-amber-300" />
              ) : (
                <UserPlus className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                {studentToEdit ? (
                  <>
                    <span>កែប្រែព័ត៌មានសិស្ស</span>
                    <span className="text-amber-300 font-bold">({studentToEdit.nameKh})</span>
                  </>
                ) : (
                  <span>ទម្រង់បញ្ចូលព័ត៌មានសិស្សថ្មី</span>
                )}
                <span className={`text-[11px] font-normal px-2 py-0.5 rounded-full border ${studentToEdit ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'}`}>
                  {studentToEdit ? 'កែប្រែទិន្នន័យសិស្ស' : 'រៀបតាមក្បាលតារាងផ្លូវការ'}
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                ព័ត៌មានដែលមានសញ្ញាផ្កាយក្រហម (<span className="text-rose-400 font-bold">*</span>) គឺ{' '}
                <strong className="text-white">ចាំបាច់ត្រូវតែបំពេញ</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-blue-100 hover:text-white font-bold rounded-xl border border-white/20 transition-all cursor-pointer text-xs"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs disabled:opacity-50 ${
                studentToEdit ? 'bg-amber-500 hover:bg-amber-600 ring-2 ring-amber-300/40' : 'bg-emerald-500 hover:bg-emerald-600 ring-2 ring-emerald-300/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'កំពុងរក្សាទុក...' : studentToEdit ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកសិស្ស'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer ml-1"
              title="បិទ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm">
          {/* Banner Notice */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-blue-900">
            <BookmarkCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              ទម្រង់នេះបែងចែកផ្នែកច្បាស់លាស់ស្របតាមក្បាលតារាងស្ថិតិសិស្ស។
              ផ្នែកទីកន្លែងកំណើត និងអាសយដ្ឋានបច្ចុប្បន្នត្រូវបានតភ្ជាប់ជាមួយ{' '}
              <strong>ភូមិសាស្ត្ររដ្ឋបាលនៃព្រះរាជាណាចក្រកម្ពុជាទាំង ២៥ រាជធានី-ខេត្ត</strong> ដោយស្វ័យប្រវត្តិ។
            </div>
          </div>

          {/* Section 1: ព័ត៌មានទូទៅសិស្ស (General Info) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                ១. ព័ត៌មានទូទៅរបស់សិស្ស
              </h4>
              <span className="text-[11px] text-slate-500 font-bold">
                ល.រ បន្ថែមទៅកាន់៖ <span className="text-emerald-600 font-black">ជួរដេកទី ១</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* ថ្នាក់រៀន (*) */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  ថ្នាក់រៀន <span className="text-rose-500 font-black">*</span>
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.classId ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
                  }`}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      📚 {c.name} {c.stream && c.stream !== 'general' ? `(${c.stream === 'science' ? 'វិទ្យាសាស្ត្រ' : 'សង្គម'})` : ''}
                    </option>
                  ))}
                </select>
                {errors.classId && <p className="text-[11px] text-rose-500 mt-1">{errors.classId}</p>}
              </div>

              {/* អត្តលេខសិស្ស */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">អត្តលេខសិស្ស</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="ឧ. 1024 ឬ ទុកនៅទំនេរ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* ភេទ (*) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ភេទ <span className="text-rose-500 font-black">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('ប្រុស')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      gender === 'ប្រុស'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨</span> ប្រុស
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('ស្រី')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      gender === 'ស្រី'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>👩</span> ស្រី
                  </button>
                </div>
              </div>

              {/* គោត្តនាម នាម (*) */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  គោត្តនាម និងនាម (ខ្មែរ) <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder="ឧ. សុខ ចាន់ថន"
                  required
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.nameKh ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
                  }`}
                />
                {errors.nameKh && <p className="text-[11px] text-rose-500 mt-1">{errors.nameKh}</p>}
              </div>

              {/* អក្សរឡាតាំង */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">អក្សរឡាតាំង (អង់គ្លេស)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="ឧ. SOK CHANTHORN"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                />
              </div>

              {/* ថ្ងៃខែឆ្នាំកំណើត (*) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>
                    ថ្ងៃកំណើត <span className="text-rose-500 font-black">*</span>
                  </span>
                  {dob && (
                    <span className="text-[11px] text-emerald-600 font-bold">
                      {formatToDMY(dob)} ({calculateAge(dob)} ឆ្នាំ)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.dob ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
                  }`}
                />
                {errors.dob && <p className="text-[11px] text-rose-500 mt-1">{errors.dob}</p>}
              </div>

              {/* មកពីសាលា */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">មកពីសាលា</label>
                <input
                  type="text"
                  value={originSchool}
                  onChange={(e) => setOriginSchool(e.target.value)}
                  placeholder="វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទផ្ទាល់ខ្លួន</label>
                <input
                  type="text"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="012 345 678"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: ទីកន្លែងកំណើត (Place of Birth - Cambodia Admin Filter) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                ២. ទីកន្លែងកំណើត (ភូមិសាស្ត្ររដ្ឋបាលនៃកម្ពុជា)
              </h4>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                ២៥ រាជធានី-ខេត្ត
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* ខេត្ត/រាជធានី */}
              <SearchableAdminInput
                label="ខេត្ត / រាជធានី"
                value={pobProvince}
                onChange={handlePobProvinceChange}
                options={allProvinces}
                themeColor="emerald"
                icon="📍"
                badge="២៥ រាជធានី-ខេត្ត"
              />

              {/* ស្រុក/ខណ្ឌ/ក្រុង */}
              <SearchableAdminInput
                label="ស្រុក / ខណ្ឌ / ក្រុង"
                value={pobDistrict}
                onChange={handlePobDistrictChange}
                options={pobDistricts}
                themeColor="emerald"
                badge={pobDistricts.length > 0 ? `${pobDistricts.length} ស្រុក/ក្រុង` : undefined}
              />

              {/* ឃុំ/សង្កាត់ */}
              <SearchableAdminInput
                label="ឃុំ / សង្កាត់"
                value={pobCommune}
                onChange={handlePobCommuneChange}
                options={pobCommunes}
                themeColor="emerald"
                badge={pobCommunes.length > 0 ? `${pobCommunes.length} ឃុំ/សង្កាត់` : undefined}
              />

              {/* ភូមិ */}
              <SearchableAdminInput
                label="ភូមិ"
                value={pobVillage}
                onChange={setPobVillage}
                options={pobVillages}
                themeColor="emerald"
                placeholder="ជ្រើសរើស ឬវាយបញ្ចូល..."
                badge={pobVillages.length > 0 ? `${pobVillages.length} ភូមិ` : undefined}
              />
            </div>
          </div>

          {/* Section 3: អាសយដ្ឋានបច្ចុប្បន្ន (Current Address) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                ៣. អាសយដ្ឋានបច្ចុប្បន្ន
              </h4>

              {/* Quick Sync Button */}
              <label className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 cursor-pointer transition-colors self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={sameAsPob}
                  onChange={(e) => setSameAsPob(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <Copy className="w-3.5 h-3.5 text-purple-600" />
                <span>ដូចទីកន្លែងកំណើត</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* ខេត្ត/រាជធានី */}
              <SearchableAdminInput
                label="ខេត្ត / រាជធានី"
                value={addrProvince}
                disabled={sameAsPob}
                onChange={handleAddrProvinceChange}
                options={allProvinces}
                themeColor="purple"
                icon="📍"
                badge="២៥ រាជធានី-ខេត្ត"
              />

              {/* ស្រុក/ខណ្ឌ/ក្រុង */}
              <SearchableAdminInput
                label="ស្រុក / ខណ្ឌ / ក្រុង"
                value={addrDistrict}
                disabled={sameAsPob}
                onChange={handleAddrDistrictChange}
                options={addrDistricts}
                themeColor="purple"
                badge={addrDistricts.length > 0 ? `${addrDistricts.length} ស្រុក/ក្រុង` : undefined}
              />

              {/* ឃុំ/សង្កាត់ */}
              <SearchableAdminInput
                label="ឃុំ / សង្កាត់"
                value={addrCommune}
                disabled={sameAsPob}
                onChange={handleAddrCommuneChange}
                options={addrCommunes}
                themeColor="purple"
                badge={addrCommunes.length > 0 ? `${addrCommunes.length} ឃុំ/សង្កាត់` : undefined}
              />

              {/* ភូមិ */}
              <SearchableAdminInput
                label="ភូមិ"
                value={addrVillage}
                disabled={sameAsPob}
                onChange={setAddrVillage}
                options={addrVillages}
                themeColor="purple"
                placeholder="ជ្រើសរើស ឬវាយបញ្ចូល..."
                badge={addrVillages.length > 0 ? `${addrVillages.length} ភូមិ` : undefined}
              />
            </div>
          </div>

          {/* Section 4: ព័ត៌មានឪពុកម្តាយ & អាណាព្យាបាល (Parents Info - Reordered to Section 4) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                ៤. ព័ត៌មានឪពុកម្តាយ និងអាណាព្យាបាល
              </h4>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-bold hidden sm:inline">
                មុខរបរ «ស្លាប់» កំណត់ស្ថានភាពកំព្រាស្វ័យប្រវត្តិ
              </span>
            </div>

            {/* ព័ត៌មានឪពុក */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                  <span>👨</span> ព័ត៌មានឪពុក
                </h5>
                {isDeceased(fatherOccupation) && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    ⚠️ ឪពុកស្លាប់ (កំព្រាឪពុក)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះឪពុក</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="ឈ្មោះឪពុក"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    មុខរបរឪពុក {isDeceased(fatherOccupation) && <span className="text-rose-600 font-bold">⚠️</span>}
                  </label>
                  <input
                    type="text"
                    value={fatherOccupation}
                    onChange={(e) => handleFatherOccupationChange(e.target.value)}
                    placeholder="ឧ. កសិករ ឬ ស្លាប់"
                    className={`w-full p-2 bg-white border rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 ${
                      isDeceased(fatherOccupation)
                        ? 'border-rose-400 bg-rose-50/30 font-bold text-rose-700'
                        : 'border-slate-200'
                    }`}
                  />
                  {/* Quick Occupation Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {COMMON_OCCUPATIONS.map((occ) => {
                      const isSel = fatherOccupation.trim() === occ;
                      const isDeadChip = occ === 'ស្លាប់';
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => handleFatherOccupationChange(isSel ? '' : occ)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            isSel
                              ? isDeadChip
                                ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                                : 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : isDeadChip
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isDeadChip ? '⚠️ ' : ''}{occ}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    placeholder="012 888 999"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ព័ត៌មានម្តាយ */}
            <div className="p-3.5 bg-pink-50/40 rounded-xl border border-pink-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-pink-950 text-xs flex items-center gap-1.5">
                  <span>👩</span> ព័ត៌មានម្តាយ
                </h5>
                {isDeceased(motherOccupation) && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    ⚠️ ម្តាយស្លាប់ (កំព្រាម្តាយ)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះម្តាយ</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="ឈ្មោះម្តាយ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    មុខរបរម្តាយ {isDeceased(motherOccupation) && <span className="text-rose-600 font-bold">⚠️</span>}
                  </label>
                  <input
                    type="text"
                    value={motherOccupation}
                    onChange={(e) => handleMotherOccupationChange(e.target.value)}
                    placeholder="ឧ. មេផ្ទះ / អាជីវករ ឬ ស្លាប់"
                    className={`w-full p-2 bg-white border rounded-xl text-slate-800 focus:ring-2 focus:ring-pink-500 ${
                      isDeceased(motherOccupation)
                        ? 'border-rose-400 bg-rose-50/30 font-bold text-rose-700'
                        : 'border-slate-200'
                    }`}
                  />
                  {/* Quick Occupation Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {COMMON_OCCUPATIONS.map((occ) => {
                      const isSel = motherOccupation.trim() === occ;
                      const isDeadChip = occ === 'ស្លាប់';
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => handleMotherOccupationChange(isSel ? '' : occ)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            isSel
                              ? isDeadChip
                                ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                                : 'bg-pink-600 text-white border-pink-600 font-bold shadow-xs'
                              : isDeadChip
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isDeadChip ? '⚠️ ' : ''}{occ}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                    placeholder="098 777 666"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* ព័ត៌មានអាណាព្យាបាល (ប្រសិនបើមិនរស់នៅជាមួយឪពុកម្តាយ) */}
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2.5">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span>🤝</span> ព័ត៌មានអាណាព្យាបាល (ប្រសិនបើមាន)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះអាណាព្យាបាល</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="ឈ្មោះ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ត្រូវជា</label>
                  <input
                    type="text"
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    placeholder="ឧ. មីង / ពូ / យាយ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={guardianOccupation}
                    onChange={(e) => setGuardianOccupation(e.target.value)}
                    placeholder="មុខរបរ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="លេខទូរស័ព្ទ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: ស្ថានភាពសិស្ស (Student Status - Moved to Section 5) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                ៥. ស្ថានភាពសិស្ស (៧ ជួរឈរតាមក្បាលតារាង)
              </h4>
              {orphanStatus !== 'none' && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                  {orphanStatus === 'both'
                    ? '🚨 កំព្រាទាំងឪពុកម្តាយ'
                    : orphanStatus === 'father'
                    ? '⚠️ កំព្រាឪពុក'
                    : '⚠️ កំព្រាម្តាយ'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* កំព្រា */}
              <div className="lg:col-span-2">
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ស្ថានភាពកំព្រា</span>
                  {(isDeceased(fatherOccupation) || isDeceased(motherOccupation)) && (
                    <span className="text-[10px] text-rose-600 font-bold">
                      (ភ្ជាប់ស្វ័យប្រវត្តិតាមមុខរបរ)
                    </span>
                  )}
                </label>
                <select
                  value={orphanStatus}
                  onChange={(e) => setOrphanStatus(e.target.value as any)}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all ${
                    orphanStatus !== 'none'
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 ring-1 ring-rose-200'
                      : 'border-slate-200'
                  }`}
                >
                  <option value="none">✨ មិនកំព្រា</option>
                  <option value="father">⚠️ កំព្រាឪពុក</option>
                  <option value="mother">⚠️ កំព្រាម្តាយ</option>
                  <option value="both">🚨 កំព្រាទាំងឪពុកម្តាយ</option>
                </select>
              </div>

              {/* ពិការ */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isDisabled}
                  onChange={(e) => setIsDisabled(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <span className="font-bold text-slate-800 text-xs">♿ ពិការ</span>
              </label>

              {/* ក្រីក្រ */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isPoor}
                  onChange={(e) => setIsPoor(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="font-bold text-slate-800 text-xs">🏷️ សិស្សក្រីក្រ</span>
              </label>

              {/* អាហារូបករណ៍ */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hasScholarship}
                  onChange={(e) => setHasScholarship(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-slate-800 text-xs">🎓 អាហារូបករណ៍</span>
              </label>

              {/* ស្នាក់នៅវត្ត */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors lg:col-span-2">
                <input
                  type="checkbox"
                  checked={stayInPagoda}
                  onChange={(e) => setStayInPagoda(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="font-bold text-slate-800 text-xs">🏛️ ស្នាក់នៅវត្ត (ក្មេងវត្ត)</span>
              </label>
            </div>
          </div>

          {/* Section 6: ផ្សេងៗ (Notes) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-2">
            <label className="block font-bold text-slate-800 text-sm">៦. ផ្សេងៗ / កំណត់ចំណាំបន្ថែម</label>
            <textarea
              rows={2}
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              placeholder="ព័ត៌មានផ្សេងៗពាក់ព័ន្ធនឹងសិស្ស..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
