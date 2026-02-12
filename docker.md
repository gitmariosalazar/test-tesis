
# Run Development

## Build

```shell
 sudo docker compose -f docker-compose.dev.yml -p epaa-services-development build --no-cache
```

```shell
 sudo docker compose -f docker-compose.dev.yml -p epaa-services-development up -d


 sudo docker compose -f docker-compose.dev.yml -p epaa-services-development down -v --remove-orphans 
```


```shell
sudo docker compose -f docker-compose.prod.yml -p epaa-services-production build --no-cache security-service

sudo docker compose -f docker-compose.prod.yml -p epaa-services-production up -d security-service

```


```shell
sudo docker compose -f docker-compose.prod.yml -p epaa-services-production build --no-cache security-service

sudo docker compose -f docker-compose.prod.yml -p epaa-services-production up -d --build --force-recreate security-service


sudo docker compose -f docker-compose.prod.yml -p epaa-services-production up -d --build security-service

```
