# File sync plugin

Extracts CSV file into a table

## Configuration

```yaml

kind: source
spec:
  name: "cq-file"
  registry: "grpc"
  path: "localhost:7777"
  version: "v1.0.0"
  tables:
    ["*"]
  destinations:
    - "sqlite"
  spec:
    path: "test_data/sample.csv" #path to the file
```
