# Auditoría de ramas y flujo de integración

## Resumen del historial reciente
```text
$ git log --oneline --decorate --graph --max-count 12
*   61b12ed (HEAD -> work) Merge pull request #41 from NavaUDP/Develop
|\  
| *   aff2d0f Merge pull request #40 from NavaUDP/main
| |\  
| |/  
|/|   
* |   d3973a7 Merge pull request #39 from NavaUDP/Rafa
|\ \  
| * \   bde0d95 Merge pull request #38 from NavaUDP/main
| |\ \  
| |/ /  
|/| |   
* | |   a84aee1 Merge pull request #37 from NavaUDP/Develop
```
- El commit más reciente (`61b12ed`) es un merge doble que incorpora simultáneamente `Develop` y `main` dentro de la rama destino, creando un grafo con múltiples merges encadenados.
- Desde el commit `a84aee1` se observa un patrón de PRs que fusionan `Develop` en `main` y, de inmediato, otra PR que fusiona `main` de vuelta en `Develop`, generando commits de merge exclusivos en cada rama.
- Las ramas temáticas como `Rafa` también se actualizan mediante merges repetidos (`3be29a9`) en lugar de rebases o fast-forward, lo que introduce commits de merge adicionales.

## Diagnóstico del problema de divergencia
1. **Uso de merges bidireccionales**: al fusionar `Develop` -> `main` y luego `main` -> `Develop`, cada rama recibe un commit de merge diferente. Ninguna rama comparte exactamente el mismo commit de cabecera, por lo que siempre aparece "1 commit ahead/behind" aunque el contenido efectivo sea idéntico.
2. **PRs basadas en ramas desactualizadas**: al crear una nueva PR desde una rama que no se rebasó sobre la rama destino más reciente, Git genera un commit de merge adicional para resolver el historial divergente.
3. **Ausencia de fast-forward**: las fusiones se realizan con merge commits aun cuando un fast-forward sería posible. Esto impide que `main`, `Develop` y otras ramas converjan en un mismo hash final.

## Recomendaciones
- **Adoptar una rama fuente única**: utilice `Develop` como rama integradora permanente. Toda funcionalidad nueva debe salir de `Develop` y las releases se generan fusionando `Develop` → `main` mediante `--ff-only`.
- **Eliminar merges de `main` hacia `Develop`**: cuando `main` reciba un hotfix crítico, rebase o cherrypick dicho cambio sobre `Develop` antes de seguir trabajando. Evite PRs que simplemente devuelven `main` a `Develop`.
- **Rebasar antes de abrir PRs**: antes de abrir una PR desde una rama de feature (por ejemplo, `Rafa`), ejecute `git fetch` y `git rebase origin/Develop` para que la PR pueda cerrarse con fast-forward.
- **Configurar protección de ramas**: configure en GitHub que `main` y `Develop` sólo acepten merges tipo fast-forward (`Require linear history`). Esto impedirá merges bidireccionales redundantes.
- **Sincronización puntual**: para alinear todas las ramas existentes, rebase cada rama activa sobre el último commit de `Develop` y force-push una única vez. Posteriormente, mantenga la disciplina de rebase/ff-only para que todos los punteros compartan el mismo commit de cabecera.

## Pasos sugeridos para corregir el estado actual
1. Elegir `Develop` como fuente de verdad y asegurarse de que compile/pruebe correctamente.
2. Mover `main` a apuntar exactamente al commit de `Develop` con `git checkout main && git reset --hard <commit-de-develop> && git push --force-with-lease`.
3. Para cada rama secundaria (por ejemplo `Rafa`), ejecutar `git rebase develop` y resolver conflictos; luego `git push --force-with-lease`.
4. A partir de ahí, usar `git merge --ff-only develop` cuando se quiera promover cambios a `main`.

Aplicando estas prácticas, los punteros de rama quedarán alineados y no aparecerán estados "ahead/behind" tras cada merge.
