## HTTP methods
Always check accepted HTTP verbs (always check OPTIONS method) :
```bash linenums="0"
curl -i -X OPTIONS 'http://<url_to_pwn>/route'
```
or
```bash
for m in GET POST PUT PATCH HEAD OPTIONS TRACE CONNECT; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X "$m" \
    -b cookies.txt -H 'Content-Type: application/json' \
    -d '<payload>' \
    'http://<url_to_pwn>/route')
  echo "$m -> $code"
done
```
> Please note that in a real-world scenario, using `DELETE` verb may delete parts of the application, or even the entire application, if carried out on the `/`