# text file source plugin

Extracts a CSV file into a table.

This is a demo plugin featuring [CloudQuery JavaScript SDK](https://github.com/cloudquery/plugin-sdk-javascript).

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
    path: "test_data/sample.csv" #path to the file or folder
    csvDelimiter: "," # optional, default is ","
```
