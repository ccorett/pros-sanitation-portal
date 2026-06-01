const PROFILE_KEY_PREFIX = "pros-employee-profile:";

export type StoredEmployeeOnboardingProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  position: string;
  department: string;
  locationAssignment: string;
  profilePictureDataUrl?: string;
  updatedAt: string;
};

export type StoredEmployeeProfileExtras = {
  profilePictureDataUrl?: string;
  updatedAt: string;
};

export function saveEmployeeOnboardingProfile(
  userId: string,
  profile: Omit<StoredEmployeeOnboardingProfile, "updatedAt">,
) {
  if (typeof window === "undefined") return;

  const payload: StoredEmployeeOnboardingProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(payload));
}

export function saveEmployeeProfileExtras(
  userId: string,
  extras: Omit<StoredEmployeeProfileExtras, "updatedAt">,
) {
  if (typeof window === "undefined") return;

  const existing = getEmployeeOnboardingProfile(userId);
  if (existing) {
    saveEmployeeOnboardingProfile(userId, {
      ...existing,
      profilePictureDataUrl:
        extras.profilePictureDataUrl ?? existing.profilePictureDataUrl,
    });
    return;
  }

  const payload: StoredEmployeeProfileExtras = {
    ...extras,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(payload));
}

export function getEmployeeOnboardingProfile(
  userId: string,
): StoredEmployeeOnboardingProfile | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredEmployeeOnboardingProfile;
  } catch {
    return null;
  }
}

export function getEmployeeProfileExtras(
  userId: string,
): StoredEmployeeProfileExtras | null {
  const profile = getEmployeeOnboardingProfile(userId);
  if (!profile) return null;

  return {
    profilePictureDataUrl: profile.profilePictureDataUrl,
    updatedAt: profile.updatedAt,
  };
}
