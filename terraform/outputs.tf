output "public_ip" {
  value = aws_instance.sezar_drive.public_ip
}

output "s3_bucket_name" {
  value = aws_s3_bucket.photos.id
}

output "ssh_command" {
  value = "ssh -i key.pem ubuntu@${aws_instance.sezar_drive.public_ip}"
}
