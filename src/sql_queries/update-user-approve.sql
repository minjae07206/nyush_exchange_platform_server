UPDATE users
SET 
    username = $1,
    profile_image = COALESCE($2, profile_image),  -- If new profile image path is null, retain old image
    wechat_qr_code_image = COALESCE($3, wechat_qr_code_image),  -- Same logic for QR code image
    pending_update = FALSE,
    update_result = 'Approved'
    last_username_updated = CASE 
        WHEN username <> $4 THEN CURRENT_TIMESTAMP  -- Only update the timestamp if the username changes
        ELSE last_username_updated
    END
WHERE user_id = $5