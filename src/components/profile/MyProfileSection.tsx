"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import { getEmployeeOnboardingProfile } from "@/lib/employee-profile-storage";
import {
  getMergedProfileView,
  saveMyProfileUpdates,
} from "@/lib/my-profile-storage";
import { Camera, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

export type MyProfileInitialData = {
  userId: string;
  employeeRecordId: string;
  employeePublicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  jobTitle: string;
  position: string | null;
  department: string;
  locationAssignment: string | null;
  employmentStatus: string;
  accountStatus: string;
};

type MyProfileSectionProps = {
  initial: MyProfileInitialData;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
        {label}
      </p>
      <p className="mt-1 text-base font-medium text-[#ebfbff]">{value || "—"}</p>
    </div>
  );
}

export function MyProfileSection({ initial }: MyProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber ?? "");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(() =>
    getMergedProfileView(initial.userId, initial.employeeRecordId, {
      firstName: initial.firstName,
      lastName: initial.lastName,
      email: initial.email,
      phoneNumber: initial.phoneNumber,
      jobTitle: initial.jobTitle,
      position: initial.position,
      department: initial.department,
      locationAssignment: initial.locationAssignment,
      employmentStatus: initial.employmentStatus,
      accountStatus: initial.accountStatus,
      employeePublicId: initial.employeePublicId,
    }),
  );

  useEffect(() => {
    const merged = getMergedProfileView(initial.userId, initial.employeeRecordId, {
      firstName: initial.firstName,
      lastName: initial.lastName,
      email: initial.email,
      phoneNumber: initial.phoneNumber,
      jobTitle: initial.jobTitle,
      position: initial.position,
      department: initial.department,
      locationAssignment: initial.locationAssignment,
      employmentStatus: initial.employmentStatus,
      accountStatus: initial.accountStatus,
      employeePublicId: initial.employeePublicId,
    });
    setView(merged);
    setPhoneNumber(merged.phoneNumber);
    setProfileImage(merged.profilePicture);
  }, [initial]);

  function handleProfileChange(file: File | undefined) {
    setProfileError(null);
    setSaveMessage(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Profile picture must be an image file.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileError("Profile picture must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setProfileImage(result);
    };
    reader.onerror = () => {
      setProfileError("Unable to read the selected image.");
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaving(true);
    setProfileError(null);
    setSaveMessage(null);

    try {
      const stored = getEmployeeOnboardingProfile(initial.userId);

      saveMyProfileUpdates(initial.userId, initial.employeeRecordId, stored, {
        phoneNumber,
        profilePictureDataUrl: profileImage,
        baseProfile: {
          firstName: initial.firstName,
          lastName: initial.lastName,
          email: initial.email,
          jobTitle: initial.jobTitle,
          position: initial.position ?? "Technician",
          department: initial.department,
          locationAssignment: initial.locationAssignment ?? "Floating/Unassigned",
        },
      });

      const merged = getMergedProfileView(initial.userId, initial.employeeRecordId, {
        firstName: initial.firstName,
        lastName: initial.lastName,
        email: initial.email,
        phoneNumber,
        jobTitle: initial.jobTitle,
        position: initial.position,
        department: initial.department,
        locationAssignment: initial.locationAssignment,
        employmentStatus: initial.employmentStatus,
        accountStatus: initial.accountStatus,
        employeePublicId: initial.employeePublicId,
      });

      setView(merged);
      setSaveMessage("Profile changes saved.");
    } catch {
      setProfileError("Unable to save profile changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {saveMessage ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {saveMessage}
        </p>
      ) : null}
      {profileError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {profileError}
        </p>
      ) : null}

      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[#ebfbff]">Personal Information</h2>
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#00c6ff]/30 bg-[#0c151d]/60">
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImage}
                alt={`${view.fullName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-[#ebfbff]/40" aria-hidden="true" />
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleProfileChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              className="min-h-[48px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              Update Profile Picture
            </Button>
          </div>
        </div>
        <div className="mt-6 divide-y divide-[#ebfbff]/10 rounded-xl border border-[#ebfbff]/10">
          <ReadOnlyField label="Full Name" value={view.fullName} />
          <ReadOnlyField label="Employee ID" value={view.employeePublicId} />
        </div>
      </section>

      <section className="glass-card rounded-2xl">
        <h2 className="border-b border-[#ebfbff]/10 px-5 py-4 text-lg font-bold text-[#ebfbff] sm:px-6">
          Contact Information
        </h2>
        <div className="divide-y divide-[#ebfbff]/10">
          <ReadOnlyField label="Email Address" value={view.email} />
          <div className="px-5 py-4 sm:px-6">
            <label htmlFor="profile-phone" className={authLabelClassName}>
              Phone Number
            </label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className={`${authInputClassName} mt-2`}
              placeholder="868-555-0100"
            />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl">
        <h2 className="border-b border-[#ebfbff]/10 px-5 py-4 text-lg font-bold text-[#ebfbff] sm:px-6">
          Employment Information
        </h2>
        <div className="divide-y divide-[#ebfbff]/10">
          <ReadOnlyField label="Position" value={view.position} />
          <ReadOnlyField label="Job Title" value={view.jobTitle} />
          <ReadOnlyField label="Department" value={view.department} />
          <ReadOnlyField label="Location Assignment" value={view.locationAssignment} />
          <ReadOnlyField label="Employment Status" value={view.employmentStatus} />
          <ReadOnlyField label="Account Status" value={view.accountStatus} />
        </div>
      </section>

      <Button
        type="button"
        variant="login"
        fullWidth
        loading={saving}
        className="min-h-[52px]"
        onClick={handleSave}
      >
        Save Changes
      </Button>
    </div>
  );
}
