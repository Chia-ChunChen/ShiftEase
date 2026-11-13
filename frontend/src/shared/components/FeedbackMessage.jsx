function FeedbackMessage({ variant, children }) {
  if (!children) return null;

  const isError = variant === 'error';

  return (
    <p className={variant} role={isError ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export default FeedbackMessage;
