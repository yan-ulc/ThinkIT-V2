#!/bin/bash
if command -v yum &> /dev/null; then
    sudo yum update -y
    sudo yum install -y git docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    sudo usermod -aG docker $USER
elif command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y git docker.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi
echo "Installation complete!"
