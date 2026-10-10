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
} from 'lucide-react';
import type { Student, ClassRoom, Gender } from '../types';
import {
  getAllProvinces,
  getDistrictsForProvince,
  getCommunesForDistrict,
} from '../utils/cambodiaGeography';
import { formatToDMY } from '../utils/dateUtils';
import { calculateAge } from '../utils/excelUtils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  defaultClassId: string;
  onSave: (student: Student) => Promise<void>;
  nextRollNo: number;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  onSave,
  nextRollNo,
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
      const targetClass = defaultClassId !== 'ALL' ? defaultClassId : (classes[0]?.id ?? '');
      setClassId(targetClass);
      setStudentCode(`STU-${String(Date.now()).slice(-4)}`);
      setNameKh('');
      setNameEn('');
      setGender('ប្រុស');
      setDob('2011-01-01');
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
  }, [isOpen, defaultClassId, classes]);

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

  // Cascading options for Current Address
  const addrDistricts = useMemo(() => getDistrictsForProvince(addrProvince), [addrProvince]);
  const addrCommunes = useMemo(
    () => getCommunesForDistrict(addrProvince, addrDistrict),
    [addrProvince, addrDistrict]
  );

  // Handle province change for POB
  const handlePobProvinceChange = (prov: string) => {
    setPobProvince(prov);
    const dists = getDistrictsForProvince(prov);
    const firstDist = dists[0] || '';
    setPobDistrict(firstDist);
    const comms = getCommunesForDistrict(prov, firstDist);
    setPobCommune(comms[0] || '');
  };

  const handlePobDistrictChange = (dist: string) => {
    setPobDistrict(dist);
    const comms = getCommunesForDistrict(pobProvince, dist);
    setPobCommune(comms[0] || '');
  };

  // Handle province change for Current Address
  const handleAddrProvinceChange = (prov: string) => {
    setAddrProvince(prov);
    const dists = getDistrictsForProvince(prov);
    const firstDist = dists[0] || '';
    setAddrDistrict(firstDist);
    const comms = getCommunesForDistrict(prov, firstDist);
    setAddrCommune(comms[0] || '');
  };

  const handleAddrDistrictChange = (dist: string) => {
    setAddrDistrict(dist);
    const comms = getCommunesForDistrict(addrProvince, dist);
    setAddrCommune(comms[0] || '');
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!nameKh.trim()) {
      newErrors.nameKh = 'សូមបញ្ចូលគោត្តនាម និងនាមសិស្ស (ចាំបាច់)';
    }

    if (!gender) {
      newErrors.gender = 'សូមជ្រើសរើសភេទ (ចាំបាច់)';
    }

    if (!dob) {
      newErrors.dob = 'សូមបញ្ចូលថ្ងៃខែឆ្នាំកំណើត (ចាំបាច់)';
    }

    if (!classId) {
      newErrors.classId = 'សូមជ្រើសរើសថ្នាក់រៀន (ចាំបាច់)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedAge = dob ? calculateAge(dob) : undefined;
      const fullPob = [pobVillage ? `ភូមិ${pobVillage}` : '', pobCommune, pobDistrict, pobProvince]
        .filter(Boolean)
        .join(' ');
      const fullAddr = [addrVillage ? `ភូមិ${addrVillage}` : '', addrCommune, addrDistrict, addrProvince]
        .filter(Boolean)
        .join(' ');

      const newStudent: Student = {
        id: `stu-${Date.now()}`,
        classId,
        rollNo: 1, // Will be placed at Row 1
        studentCode: studentCode.trim() || `STU-${String(Date.now()).slice(-4)}`,
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
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await onSave(newStudent);
      onClose();
    } catch (err) {
      console.error('Error saving new student:', err);
      alert('មានបញ្ហាក្នុងការរក្សាទុកសិស្ស! សូមព្យាយាមម្តងទៀត។');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 z-10 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#002060] via-[#0b3c7b] to-[#002060] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <UserPlus className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                ទម្រង់បញ្ចូលព័ត៌មានសិស្សថ្មី
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  រៀបតាមក្បាលតារាងផ្លូវការ
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                ព័ត៌មានដែលមានសញ្ញាផ្កាយក្រហម (<span className="text-rose-400 font-bold">*</span>) គឺ{' '}
                <strong className="text-white">ចាំបាច់ត្រូវតែបំពេញ</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
                      📚 {c.name}
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
                  placeholder="STU-001"
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">ខេត្ត / រាជធានី</label>
                <select
                  value={pobProvince}
                  onChange={(e) => handlePobProvinceChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  {allProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      📍 {prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* ស្រុក/ខណ្ឌ/ក្រុង */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ស្រុក / ខណ្ឌ / ក្រុង</label>
                <select
                  value={pobDistrict}
                  onChange={(e) => handlePobDistrictChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  {pobDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* ឃុំ/សង្កាត់ */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឃុំ / សង្កាត់</label>
                <select
                  value={pobCommune}
                  onChange={(e) => setPobCommune(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  {pobCommunes.map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>

              {/* ភូមិ */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ភូមិ</label>
                <input
                  type="text"
                  value={pobVillage}
                  onChange={(e) => setPobVillage(e.target.value)}
                  placeholder="ឧ. ត្រពាំងព្រីង"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">ខេត្ត / រាជធានី</label>
                <select
                  value={addrProvince}
                  disabled={sameAsPob}
                  onChange={(e) => handleAddrProvinceChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 disabled:opacity-60 transition-all"
                >
                  {allProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      📍 {prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* ស្រុក */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ស្រុក / ខណ្ឌ / ក្រុង</label>
                <select
                  value={addrDistrict}
                  disabled={sameAsPob}
                  onChange={(e) => handleAddrDistrictChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 disabled:opacity-60 transition-all"
                >
                  {addrDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* ឃុំ */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឃុំ / សង្កាត់</label>
                <select
                  value={addrCommune}
                  disabled={sameAsPob}
                  onChange={(e) => setAddrCommune(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 disabled:opacity-60 transition-all"
                >
                  {addrCommunes.map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>

              {/* ភូមិ */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ភូមិ</label>
                <input
                  type="text"
                  value={addrVillage}
                  disabled={sameAsPob}
                  onChange={(e) => setAddrVillage(e.target.value)}
                  placeholder="ឧ. ត្រពាំងព្រីង"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 disabled:opacity-60 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: ស្ថានភាពសិស្ស (Student Status) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                ៤. ស្ថានភាពសិស្ស (៧ ជួរឈរតាមក្បាលតារាង)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* កំព្រា */}
              <div className="lg:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">ស្ថានភាពកំព្រា</label>
                <select
                  value={orphanStatus}
                  onChange={(e) => setOrphanStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
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

          {/* Section 5: ព័ត៌មានឪពុកម្តាយ & អាណាព្យាបាល (Parents Info) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                ៥. ព័ត៌មានឪពុកម្តាយ និងអាណាព្យាបាល
              </h4>
            </div>

            {/* ព័ត៌មានឪពុក */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2.5">
              <h5 className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                <span>👨</span> ព័ត៌មានឪពុក
              </h5>
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={fatherOccupation}
                    onChange={(e) => setFatherOccupation(e.target.value)}
                    placeholder="ឧ. កសិករ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
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
              <h5 className="font-black text-pink-950 text-xs flex items-center gap-1.5">
                <span>👩</span> ព័ត៌មានម្តាយ
              </h5>
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={motherOccupation}
                    onChange={(e) => setMotherOccupation(e.target.value)}
                    placeholder="ឧ. មេផ្ទះ / អាជីវករ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-pink-500"
                  />
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            <span className="text-rose-500 font-bold">*</span> ចាំបាច់ត្រូវបំពេញ៖ <strong>ឈ្មោះ, ភេទ, ថ្ងៃកំណើត, ថ្នាក់</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>កំពុងរក្សាទុក...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  រក្សាទុកសិស្សថ្មី
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
