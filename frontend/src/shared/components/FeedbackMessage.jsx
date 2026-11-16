import './FeedbackMessage.css'

function FeedbackMessage({ variant, children }) {
  if (!children) return null;

  const isError = variant === 'error';

  return (
    <p
      className={`feedback-message feedback-message--${variant}`}
      role={isError ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export default FeedbackMessage;
