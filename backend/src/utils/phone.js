import { parsePhoneNumberFromString } from "libphonenumber-js";

const normalizePhone = (phone, country) => {
  if (typeof phone !== "string" || phone.trim() === "") {
    return null;
  }

  if (!phone.trim().startsWith("+") && !country) {
    return null;
  }

  try {
    const parsed = parsePhoneNumberFromString(phone.trim(), country);
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return parsed.number;
  } catch {
    return null;
  }
};

export { normalizePhone };