export function validatePassword(password) {
  if (typeof password !== 'string') {
    return 'Enter a temporary password.'
  }

  const hasRequiredCharacters =
    /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(password)
  const isWithinByteLimit =
    new TextEncoder().encode(password).length <= 72

  if (!hasRequiredCharacters) {
    return 'Use at least 8 characters, including a letter and a number.'
  }

  if (!isWithinByteLimit) {
    return 'The password must not exceed 72 UTF-8 bytes.'
  }

  return ''
}