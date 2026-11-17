// The "/mobile" version of libphonenumber-js only accepts MOBILE numbers,
// so landlines like 0414 123 456 (which can't receive a Mobile Money prompt) are rejected.
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/mobile'

export const DEFAULT_COUNTRY: CountryCode = 'UG'

// Countries where we can actually take a Mobile Money payment.
// Only Uganda for now: our payment provider (iotec) collects in Uganda only.
// When that changes, add the country's two-letter code here, e.g. 'KE'.
export const PAYMENT_COUNTRIES: CountryCode[] = ['UG']

// Turns a code like 'UG' into a name like 'Uganda' (built into the browser).
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

export interface CountryOption {
  code: CountryCode // 'UG'
  name: string // 'Uganda'
  dialCode: string // '+256'
}

// Every country libphonenumber-js knows about, sorted by name,
// with our default country (Uganda) moved to the top of the list.
export const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => {
    if (a.code === DEFAULT_COUNTRY) return -1
    if (b.code === DEFAULT_COUNTRY) return 1
    return a.name.localeCompare(b.name)
  })

// 'UG' -> '+256 (UG)', the short text shown inside the closed dropdown.
export function countryLabel(country: CountryCode) {
  return `+${getCountryCallingCode(country)} (${country})`
}

// iotec's sandbox test numbers (011177xxxx) aren't real Ugandan numbers, so the library
// rejects them. We allow them while developing locally, or when VITE_PAYMENTS_SANDBOX=true.
const SANDBOX = import.meta.env.DEV || import.meta.env.VITE_PAYMENTS_SANDBOX === 'true'
// 011177777X = Success, 011177799X = Failed, 011177778X = Pending, 011177779X = SentToVendor
const IOTEC_TEST_NUMBER = /^0?111777(77|99|78|79)\d$/

// Checks a mobile number typed by a reader, for the country picked in the dropdown.
// For Uganda it accepts '0772123456', '772 123 456' or '+256772123456'.
// Returns the number in international format ('+256772123456'), or null if it isn't valid.
export function parseMobileNumber(input: string, country: CountryCode): string | null {
  const trimmed = input.trim()

  if (SANDBOX && country === 'UG') {
    const digits = trimmed.replace(/[\s-]/g, '')
    if (IOTEC_TEST_NUMBER.test(digits)) {
      return `+256${digits.replace(/^0/, '')}`
    }
  }

  const parsed = parsePhoneNumberFromString(trimmed, country)
  if (!parsed || !parsed.isValid() || parsed.country !== country) return null
  return parsed.number
}
