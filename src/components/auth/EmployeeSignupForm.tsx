"use client";

import { FormEvent, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AUTH_POST_SIGNUP_PATH } from "@/lib/auth-routes";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth-form-styles";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_LOCATION_ASSIGNMENTS,
  EMPLOYEE_POSITIONS,
} from "@/lib/employee-signup-options";
import {
  isPinValid,
  normalizePinInput,
  PIN_REQUIREMENTS_MESSAGE,
} from "@/lib/pin";
import type { PublicSignupPolicy } from "@/lib/signup-access";
import { Button } from "@/components/ui/Button";
import { User } from "lucide-react";

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

type EmployeeSignupFormProps = {
  policy: PublicSignupPolicy;
  signedInEmail?: string;
};

export function EmployeeSignupForm({
  policy,
  signedInEmail,
}: EmployeeSignupFormProps) {
  const completingProfile = Boolean(signedInEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [locationAssignment, setLocationAssignment] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileDataUrl, setProfileDataUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileChange = (file: File | undefined) => {
    setProfileError(null);

    if (!file) {
      setProfilePreview(null);
      setProfileDataUrl(null);
      return;
    }

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

      setProfileDataUrl(result);
      setProfilePreview(result);
    };
    reader.onerror = () => {
      setProfileError("Unable to read the selected image.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setProfileError(null);

    if (policy.inviteRequired && !inviteCode.trim()) {
      setError("Enter the invite code provided by your administrator.");
      return;
    }

    if (!completingProfile) {
      if (!isPinValid(pin)) {
        setError(PIN_REQUIREMENTS_MESSAGE);
        return;
      }

      if (!isPinValid(confirmPin)) {
        setError(PIN_REQUIREMENTS_MESSAGE);
        return;
      }

      if (pin !== confirmPin) {
        setError("Confirm PIN must match your 4 digit PIN.");
        return;
      }
    }

    if (!position || !department || !locationAssignment) {
      setError("Select your position, department, and location assignment.");
      return;
    }

    setLoading(true);

    try {
      if (!completingProfile) {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password: pin,
          name: `${firstName.trim()} ${lastName.trim()}`,
          callbackURL: AUTH_POST_SIGNUP_PATH,
          ...(policy.inviteRequired
            ? { inviteCode: inviteCode.trim() }
            : {}),
        } as Parameters<typeof authClient.signUp.email>[0]);

        if (result.error) {
          setError(
            result.error.message ?? "Unable to create account. Please try again.",
          );
          return;
        }
      }

      const profile = await fetch("/api/employees/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          jobTitle: jobTitle.trim(),
          position,
          department,
          locationAssignment,
          ...(profileDataUrl ? { profilePictureUrl: profileDataUrl } : {}),
          ...(policy.inviteRequired
            ? { inviteCode: inviteCode.trim() }
            : {}),
        }),
      });

      const profilePayload = (await profile.json()) as {
        error?: string;
      };

      if (!profile.ok) {
        setError(
          profilePayload.error ??
            "Employee profile not found. Contact admin.",
        );
        return;
      }

      window.location.assign("/pending-verification");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create account right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectClassName = `${authInputClassName} appearance-none text-[#ebfbff] [&>option]:bg-[#0c151d] [&>option]:text-[#ebfbff]`;

  return (
    <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        {error && (
          <p className={authErrorClassName} role="alert">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-4">
          <p className="text-sm font-medium text-[#ebfbff]/80">Profile Picture</p>
          <p className="mt-1 text-xs text-[#ebfbff]/50">Optional — image files only</p>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ebfbff]/15 bg-[#0c151d]/60">
              {profilePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-[#ebfbff]/35" aria-hidden="true" />
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  handleProfileChange(event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[48px]"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Profile Picture
              </Button>
              {profilePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                    handleProfileChange(undefined);
                  }}
                  className="text-left text-sm text-[#00c6ff] hover:text-[#6cc801]"
                >
                  Remove photo
                </button>
              ) : null}
              {profileError ? (
                <p className="text-xs text-red-300" role="alert">
                  {profileError}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={authLabelClassName}>
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInputClassName}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={authLabelClassName}>
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authInputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={authLabelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            readOnly={completingProfile}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={[
              authInputClassName,
              completingProfile ? "cursor-not-allowed opacity-80" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className={authLabelClassName}>
            Phone Number
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="868-555-0100"
            className={authInputClassName}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="jobTitle" className={authLabelClassName}>
              Job Title
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Field Sanitation Lead"
              className={authInputClassName}
            />
          </div>
          <div>
            <label htmlFor="position" className={authLabelClassName}>
              Position
            </label>
            <select
              id="position"
              name="position"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select position</option>
              {EMPLOYEE_POSITIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="department" className={authLabelClassName}>
              Department
            </label>
            <select
              id="department"
              name="department"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select department</option>
              {EMPLOYEE_DEPARTMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="locationAssignment" className={authLabelClassName}>
              Location Assignment
            </label>
            <select
              id="locationAssignment"
              name="locationAssignment"
              required
              value={locationAssignment}
              onChange={(e) => setLocationAssignment(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select location</option>
              {EMPLOYEE_LOCATION_ASSIGNMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {policy.inviteRequired && (
          <div>
            <label htmlFor="inviteCode" className={authLabelClassName}>
              Invite code
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              autoComplete="off"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your invite code"
              className={authInputClassName}
            />
          </div>
        )}

        {!completingProfile ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pin" className={authLabelClassName}>
                4 Digit PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                required
                maxLength={4}
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(normalizePinInput(e.target.value))}
                placeholder="0000"
                className={authInputClassName}
              />
              <p className="mt-2 text-xs text-[#ebfbff]/50">
                {PIN_REQUIREMENTS_MESSAGE}
              </p>
            </div>
            <div>
              <label htmlFor="confirmPin" className={authLabelClassName}>
                Confirm 4 Digit PIN
              </label>
              <input
                id="confirmPin"
                name="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                required
                maxLength={4}
                pattern="\d{4}"
                value={confirmPin}
                onChange={(e) => setConfirmPin(normalizePinInput(e.target.value))}
                placeholder="0000"
                className={authInputClassName}
              />
            </div>
          </div>
        ) : null}

        <Button type="submit" variant="login" loading={loading} fullWidth>
          {completingProfile ? "Complete Employee Profile" : "Create Employee Account"}
        </Button>
      </form>
    </div>
  );
}
