sudo apt update && sudo apt upgrade -y
sudo apt-get install rabbitmq-server -y
sudo apt-get install yarn -y
sudo apt-get install nodejs -y
echo "@reboot ~/Vortex/start.sh" | crontab -
sudo reboot
