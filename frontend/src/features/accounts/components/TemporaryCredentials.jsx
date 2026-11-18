import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'

function TemporaryCredentials({ credentials }) {
  if (!credentials?.password) return null
  return (
    <FeedbackMessage variant="success">
      <span>Email: {credentials.email}</span>
      <br />
      <span>Temporary password: <code>{credentials.password}</code></span>
      <br />
      <span>Share these details privately. The user must change the password after signing in.</span>
    </FeedbackMessage>
  )
}

export default TemporaryCredentials
