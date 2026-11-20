import { postJson } from '../../../shared/services/apiClient.js'

export async function createEmployee(employee) {
  const response = await postJson('/api/employees', employee)

  if (!response?.data?._id) {
    throw new Error(
      'The server did not confirm the employee record. Check whether it was created before submitting again.',
    )
  }

  return response
}