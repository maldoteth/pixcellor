DELETE FROM pgmq.q_auth_emails
WHERE message->>'purpose' = 'transactional'
  AND (message->>'run_id' IS NULL OR message->>'run_id' = '')
  AND message->>'label' IN ('signup', 'invite', 'magiclink', 'recovery', 'email_change', 'reauthentication');