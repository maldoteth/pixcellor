DELETE FROM pgmq.q_auth_emails
WHERE message->>'purpose' = 'transactional'
  AND message->>'label' = 'magiclink'
  AND (message->>'unsubscribe_token' IS NULL OR message->>'unsubscribe_token' = '');