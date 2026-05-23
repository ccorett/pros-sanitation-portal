export const PIN_REQUIREMENTS_MESSAGE = "PIN must be exactly 4 digits";

export function isPinValid(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function normalizePinInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}
