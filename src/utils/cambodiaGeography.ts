/**
 * Cambodia Administrative Geography Data (ភូមិសាស្ត្ររដ្ឋបាលនៃព្រះរាជាណាចក្រកម្ពុជា)
 * Contains all 25 Capital and Provinces with their official Districts, Communes, and Villages.
 */
import rawAdminData from '../data/cambodiaAdministrativeData.json';

export interface AdminCommune {
  name: string;
  villages: string[];
}

export interface AdminDistrict {
  name: string;
  communes: AdminCommune[];
}

export interface AdminProvince {
  province: string;
  districts: AdminDistrict[];
}

export interface ProvinceData {
  name: string;
  districts: {
    name: string;
    communes: string[];
  }[];
}

export const CAMBODIA_ADMIN_DATA: AdminProvince[] = rawAdminData as AdminProvince[];

// Backward compatibility with previous CAMBODIA_GEOGRAPHY format
export const CAMBODIA_GEOGRAPHY: ProvinceData[] = CAMBODIA_ADMIN_DATA.map((p) => ({
  name: p.province,
  districts: p.districts.map((d) => ({
    name: d.name,
    communes: d.communes.map((c) => c.name),
  })),
}));

export function cleanAdminPrefix(s: string): string {
  if (!s) return '';
  return s
    .trim()
    .replace(/^(ខេត្ត|រាជធានី|ស្រុក|ខណ្ឌ|ក្រុង|ឃុំ|សង្កាត់|ភូមិ)/, '')
    .trim();
}

export function matchAdministrativeName(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = a.trim();
  const cb = b.trim();
  if (ca === cb) return true;
  const cleanA = cleanAdminPrefix(ca);
  const cleanB = cleanAdminPrefix(cb);
  return cleanA === cleanB || ca.includes(cleanB) || cb.includes(cleanA);
}

export function getAllProvinces(): string[] {
  return CAMBODIA_ADMIN_DATA.map((p) => p.province);
}

export function getDistrictsForProvince(provinceName: string): string[] {
  if (!provinceName) return [];
  const p = CAMBODIA_ADMIN_DATA.find((item) => matchAdministrativeName(item.province, provinceName));
  return p ? p.districts.map((d) => d.name) : [];
}

export function getCommunesForDistrict(provinceName: string, districtName: string): string[] {
  if (!districtName) return [];
  const p = CAMBODIA_ADMIN_DATA.find((item) => matchAdministrativeName(item.province, provinceName));
  const districtList = p ? p.districts : CAMBODIA_ADMIN_DATA.flatMap((item) => item.districts);
  const d = districtList.find((item) => matchAdministrativeName(item.name, districtName));
  return d ? d.communes.map((c) => c.name) : [];
}

export function getVillagesForCommune(
  provinceName: string,
  districtName: string,
  communeName: string
): string[] {
  if (!communeName) return [];

  // Try targeted match first
  const p = CAMBODIA_ADMIN_DATA.find((item) => matchAdministrativeName(item.province, provinceName));
  const districts = p ? p.districts : CAMBODIA_ADMIN_DATA.flatMap((item) => item.districts);
  const d = districts.find((item) => matchAdministrativeName(item.name, districtName));
  const communes = d ? d.communes : districts.flatMap((item) => item.communes);
  const c = communes.find((item) => matchAdministrativeName(item.name, communeName));

  return c ? c.villages : [];
}
