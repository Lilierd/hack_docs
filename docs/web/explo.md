## Méthodes HTTP
Toujours checker les méthodes acceptées (always check OPTIONS method) :
```bash
curl -i -X OPTIONS 'http://<url_to_pwn>/route'
```
ou
```bash
for m in GET POST PUT PATCH HEAD OPTIONS TRACE CONNECT; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X "$m" \
    -b cookies.txt -H 'Content-Type: application/json' \
    -d '<payload>' \
    'http://<url_to_pwn>/route')
  echo "$m -> $code"
done
```
> Attention en situation réelle faire un `DELETE` peux supprimer des parties de l'application, voire toute l'application si on le fait sur le `/`