"use client";

import { Button } from "@/components/ui/Button";
import { getProfilePicture, setProfilePicture } from "@/lib/hr-client-storage";
import { mockLocationAssignment } from "@/lib/hr-mock-data";
import { Camera, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ProfileSectionProps = {
  employeeRecordId: string;
  employeePublicId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  position: string;
  jobTitle: string;
};

export function ProfileSection({
  employeeRecordId,
  employeePublicId,
  name,
  email,
  phoneNumber,
  position,
  jobTitle,
}: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    setProfileImage(getProfilePicture(employeeRecordId));
  }, [employeeRecordId]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfilePicture(employeeRecordId, result);
        setProfileImage(result);
      }
    };
    reader.readAsDataURL(file);
  }

  const fields = [
    { label: "Name", value: name },
    { label: "Employee ID", value: employeePublicId },
    { label: "Email", value: email },
    { label: "Phone Number", value: phoneNumber ?? "Not on file" },
    { label: "Position", value: position },
    { label: "Job Title", value: jobTitle },
    { label: "Location Assignment", value: mockLocationAssignment },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="glass-card rounded-2xl p-6 text-center sm:p-8">
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#00c6ff]/30 bg-[#0c151d]/60">
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImage}
              alt={`${name} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-[#ebfbff]/40" aria-hidden="true" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-6 min-h-[52px] text-base"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Upload Profile Picture
        </Button>
      </div>

      <div className="glass-card divide-y divide-[#ebfbff]/10 rounded-2xl">
        {fields.map((field) => (
          <div key={field.label} className="px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
              {field.label}
            </p>
            <p className="mt-1 text-base font-medium text-[#ebfbff]">{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
