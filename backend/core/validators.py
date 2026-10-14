from rest_framework import serializers


MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
ATTACHMENT_SIGNATURES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}


def validate_attachment(upload):
    if upload.size > MAX_ATTACHMENT_SIZE:
        raise serializers.ValidationError("Attachment must not exceed 5 MB.")
    filename = upload.name.lower()
    extension = next(
        (extension for extension in ATTACHMENT_SIGNATURES if filename.endswith(extension)),
        None,
    )
    if extension is None:
        raise serializers.ValidationError(
            "Only PDF, JPEG and PNG attachments are allowed."
        )
    expected_type, signature = ATTACHMENT_SIGNATURES[extension]
    if upload.content_type != expected_type:
        raise serializers.ValidationError(
            "Attachment content type does not match the file extension."
        )
    header = upload.read(len(signature))
    upload.seek(0)
    if not header.startswith(signature):
        raise serializers.ValidationError("Attachment file content is invalid.")
    return upload


def validate_avatar(upload):
    if upload and not upload.name.lower().endswith((".jpg", ".jpeg", ".png")):
        raise serializers.ValidationError("Profile photos must be JPEG or PNG images.")
    return validate_attachment(upload) if upload else upload
