FROM python:3.10-alpine

ENV FLASK_APP=semantle

RUN mkdir /app
WORKDIR /app

RUN apk add --no-cache make gcc g++ python3-dev

COPY ./requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT [ "gunicorn", "semantle:app", "--bind", "0.0.0.0:80" ]