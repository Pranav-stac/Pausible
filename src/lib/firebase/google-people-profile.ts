import { ageYearsToRange, mapGoogleGender, type ProfileAgeRange, type ProfileGender } from "@/lib/profile/demographics-options";

type PeopleBirthday = { date?: { year?: number; month?: number; day?: number } };
type PeopleGender = { value?: string };

type PeopleProfileResponse = {
  birthdays?: PeopleBirthday[];
  genders?: PeopleGender[];
};

export type GooglePeopleDemographics = {
  ageRange?: ProfileAgeRange;
  dateOfBirth?: string;
  gender?: ProfileGender;
};

function birthdayToIsoDate(birthday: PeopleBirthday | undefined): string | undefined {
  const year = birthday?.date?.year;
  if (year == null || year < 1900) return undefined;
  const month = birthday?.date?.month ?? 1;
  const day = birthday?.date?.day ?? 1;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return iso;
}

function pickPrimaryBirthday(birthdays: PeopleBirthday[] | undefined): PeopleBirthday | undefined {
  if (!birthdays?.length) return undefined;
  return birthdays.find((b) => b.date?.year != null) ?? birthdays[0];
}

function ageFromBirthday(birthday: PeopleBirthday | undefined, now = new Date()): number | undefined {
  const year = birthday?.date?.year;
  if (year == null || year < 1900) return undefined;

  const month = (birthday?.date?.month ?? 1) - 1;
  const day = birthday?.date?.day ?? 1;
  const born = new Date(year, month, day);
  if (Number.isNaN(born.getTime())) return undefined;

  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  if (age < 0 || age > 120) return undefined;
  return age;
}

/** Requires People API + birthday/gender scopes on the Google OAuth token. */
export async function fetchGooglePeopleDemographics(accessToken: string): Promise<GooglePeopleDemographics> {
  const url = new URL("https://people.googleapis.com/v1/people/me");
  url.searchParams.set("personFields", "birthdays,genders");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return {};

  const data = (await res.json()) as PeopleProfileResponse;
  const birthday = pickPrimaryBirthday(data.birthdays);
  const age = ageFromBirthday(birthday);
  const gender = mapGoogleGender(data.genders?.[0]?.value);

  return {
    ageRange: age != null ? ageYearsToRange(age) : undefined,
    dateOfBirth: birthdayToIsoDate(birthday),
    gender,
  };
}
