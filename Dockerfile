FROM node:11.4.0-alpine

RUN mkdir /code

WORKDIR /code

COPY package.json /code/

RUN npm install && npm i pm2 -g

COPY . /code/

RUN npm run build

CMD ["pm2-runtime", "process.yml"]