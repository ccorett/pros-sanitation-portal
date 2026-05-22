export const clerkAppearance = {
  variables: {
    colorPrimary: "#259f00",
    colorBackground: "#0c151d",
    colorInputBackground: "#0c151d",
    colorInputText: "#ebfbff",
    colorText: "#ebfbff",
    colorTextSecondary: "rgba(235, 251, 255, 0.6)",
    colorDanger: "#ef4444",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "glass-card border-[#00c6ff]/20 shadow-none",
    headerTitle: "text-[#ebfbff]",
    headerSubtitle: "text-[#ebfbff]/60",
    socialButtonsBlockButton:
      "border border-[#ebfbff]/15 bg-[#0c151d]/60 text-[#ebfbff]",
    formButtonPrimary:
      "bg-gradient-to-r from-[#259f00] to-[#6cc801] text-[#0c151d] hover:brightness-110",
    footerActionLink: "text-[#00c6ff] hover:text-[#6cc801]",
    identityPreviewEditButton: "text-[#00c6ff]",
    formFieldInput:
      "border border-[#ebfbff]/15 bg-[#0c151d]/60 text-[#ebfbff] min-h-[48px]",
    dividerLine: "bg-[#ebfbff]/10",
    dividerText: "text-[#ebfbff]/50",
  },
} as const;
