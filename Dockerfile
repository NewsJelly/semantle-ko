FROM python:3.9-slim

ENV FLASK_APP=semantle

RUN mkdir /app
WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

COPY ./requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT [ "gunicorn", "semantle:app", "--bind", "0.0.0.0:80" ]