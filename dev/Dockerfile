FROM arangodb:latest

# Collections that will be loaded in the databases.
# See the readme for generation instructions.
COPY ./data /docker-entrypoint-initdb.d/data/

# Initialization script, will create the databases, collections and load the data
# in the collections.
# The init script will be automatically executed during container startup
# thanks to the /docker-entrypoint-initdb.d/ directory
COPY ./init.js /docker-entrypoint-initdb.d/

# ENV ARANGO_ROOT_PASSWORD=root
ENV ARANGO_ROOT_PASSWORD=root

# Default arangodb port
EXPOSE 8529

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8529/_api/version || exit 1