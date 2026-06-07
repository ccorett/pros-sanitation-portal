"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import type { EmployeeProfileDto } from "@/lib/employee-profile-service";
import { Camera, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

function formatStatusLabel(value: string): string {
  if (value === "PENDING_VERIFICATION") {
    return "Awaiting Activation";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

export function MyProfileSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<EmployeeProfileDto | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/employees/me", { cache: "no-store" });
      const data = (await response.json()) as {
        profile?: EmployeeProfileDto;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load profile.");
      }

      if (!data.profile) {
        throw new Error("Employee profile not found. Contact admin.");
      }

      setProfile(data.profile);
      setPhoneNumber(data.profile.phoneNumber ?? "");
      setEmergencyContactName(data.profile.emergencyContactName ?? "");
      setEmergencyContactPhone(data.profile.emergencyContactPhone ?? "");
      setProfileImage(data.profile.profilePictureUrl);
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to load profile.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
      if (typeof result === "string") {
        setProfileImage(result);
      }
    };
    reader.onerror = () => {
      setProfileError("Unable to read the selected image.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setProfileError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/employees/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          profilePictureUrl: profileImage,
        }),
      });

      const data = (await response.json()) as {
        profile?: EmployeeProfileDto;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save profile changes.");
      }

      if (data.profile) {
        setProfile(data.profile);
        setProfileImage(data.profile.profilePictureUrl);
      }

      setSaveMessage("Profile changes saved.");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to save profile changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ff4d4f]">
        {profileError ?? "Employee profile not found. Contact admin."}
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

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
                alt={`${fullName} profile`}
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
          <ReadOnlyField label="Full Name" value={fullName} />
          <ReadOnlyField label="Employee ID" value={profile.employeeId} />
        </div>
      </section>

      <section className="glass-card rounded-2xl">
        <h2 className="border-b border-[#ebfbff]/10 px-5 py-4 text-lg font-bold text-[#ebfbff] sm:px-6">
          Contact Information
        </h2>
        <div className="divide-y divide-[#ebfbff]/10">
          <ReadOnlyField label="Email Address" value={profile.companyEmail} />
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
          Emergency Contact
        </h2>
        <div className="space-y-0 divide-y divide-[#ebfbff]/10">
          <div className="px-5 py-4 sm:px-6">
            <label htmlFor="emergency-name" className={authLabelClassName}>
              Contact Name
            </label>
            <input
              id="emergency-name"
              type="text"
              value={emergencyContactName}
              onChange={(event) => setEmergencyContactName(event.target.value)}
              className={`${authInputClassName} mt-2`}
              placeholder="Full name"
            />
          </div>
          <div className="px-5 py-4 sm:px-6">
            <label htmlFor="emergency-phone" className={authLabelClassName}>
              Contact Phone
            </label>
            <input
              id="emergency-phone"
              type="tel"
              value={emergencyContactPhone}
              onChange={(event) => setEmergencyContactPhone(event.target.value)}
              className={`${authInputClassName} mt-2`}
              placeholder="868-555-0100"
            />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl">
        <h2 className="border-b border-[#ebfbff]/10 px-5 py-4 text-lg font-bold text-[#ebfbff] sm:px-6">
          Employment Profile
        </h2>
        <div className="divide-y divide-[#ebfbff]/10">
          <ReadOnlyField
            label="Primary Work Location"
            value={profile.primaryLocationAssignment ?? "—"}
          />
          <ReadOnlyField
            label="Additional Work Locations"
            value={
              profile.additionalLocationAssignments.length > 0
                ? profile.additionalLocationAssignments.join(", ")
                : "—"
            }
          />
          <ReadOnlyField label="Department" value={profile.department} />
          <ReadOnlyField label="Job Title" value={profile.jobTitle} />
          <ReadOnlyField label="Role" value={profile.accessLevelLabel} />
          <ReadOnlyField
            label="Responsibilities"
            value={profile.responsibilitiesLabel}
          />
          <ReadOnlyField
            label="Employment Status"
            value={formatStatusLabel(profile.employmentStatus)}
          />
          <ReadOnlyField
            label="Account Status"
            value={formatStatusLabel(profile.accountStatus)}
          />
        </div>
      </section>

      <Button
        type="button"
        variant="login"
        fullWidth
        loading={saving}
        className="min-h-[52px]"
        onClick={() => void handleSave()}
      >
        Save Changes
      </Button>
    </div>
  );
}
