
# Plano: Excluir Estrategias Nao Utilizadas

## Resumo
Excluir 36 estrategias do banco de dados que nao fazem parte das estrategias oficiais do sistema.

---

## Estrategias a Serem Excluidas

| Nome | Quantidade | IDs |
|------|------------|-----|
| al | 1 | d541a320-5c31-40f9-b096-5b8a1bda5c5b |
| hilo +volume | 4 | cccd031b, 8a52a8f9, 14d3042d, d10c2532 |
| antigo 2021 | 1 | 6e549dd4-2baf-406c-b036-478eed5c776b |
| 30 min | 1 | 0c9ddcb1-166f-448f-b4bd-f7c286f24a13 |
| WIN | 1 | a2865519-ed92-46b7-94bb-e91bd77a7316 |
| gennaio | 1 | 52d098a0-8642-4187-a081-81c95c378520 |
| Esat | 1 | 1b6b2add-3f92-441c-8f0e-7553b80c25a5 |
| EsT. de Testes | 1 | 052d2c54-2589-4fa3-bd66-b5e6aeedcdad |
| ENGTRADE 2025 | 1 | 6253306f-9e24-4a96-afaa-f95900e87d7c |
| dolarabertura | 3 | fb0f7d7a, 3b86d37e, d21c7fe0 |
| dolar abertura | 2 | 4d3defc3, 18c5af59 |
| Acumulado | 1 | c66eab4b-7366-4491-b0c4-392d81ea72e5 |
| Front Running | 2 | 408d5940, e5dea079 |
| ll | 1 | cb921699-affd-4c74-ac52-90c2dbe6ae9c |
| NORMAL | 1 | 746c1045-4f9f-4269-adef-2757d221a82d |
| teste | 2 | 0f3985a5, e485e2e5 |
| Rebote do gato morto | 2 | 67a5257c, e4b03336 |
| engtrade | 3 | 4017a670, a59ef871, 65b66a55 |
| 60 FIXO | 1 | 720fdd0e-34ed-4318-bd81-b997b50843ea |
| Fabricio Pessoal | 1 | 4592c7f1-75ff-4260-9bc2-50df2d8f821f |
| FGZ | 1 | 8b504060-bd5c-4ea5-a4a5-a234420bc5f1 |
| ESTRATEGIA 60 MINUTOS | 1 | d5024ba1-f339-4794-851c-9e76c38e3172 |
| Sala scalper | 1 | c2735fe0-ee40-45dc-9856-d80e92bb1f61 |
| Copy | 1 | dfec8bef-1a95-4acb-9765-08e0d06ec9ad |
| Setup VB | 1 | 11ee8a79-85f7-4e5c-90ca-7fbe87116cd6 |

**Total: 36 estrategias**

---

## Acao a Executar

Executar DELETE direto no banco de dados para remover todas as estrategias listadas:

```sql
DELETE FROM strategies WHERE name IN (
  'al', 'hilo +volume', 'antigo 2021', '30 min', 'WIN', 
  'gennaio', 'Esat', 'EsT. de Testes', 'ENGTRADE 2025',
  'dolarabertura', 'dolar abertura', 'Acumulado', 'Front Running',
  'll', 'NORMAL', 'teste', 'Rebote do gato morto', 'engtrade',
  '60 FIXO', 'Fabricio Pessoal', 'FGZ', 'ESTRATEGIA 60 MINUTOS',
  'Sala scalper', 'Copy', 'Setup VB'
);
```

---

## Estrategias Oficiais Preservadas

Apos a limpeza, apenas as estrategias oficiais permanecerão:
- Alaska & Square
- Apollo
- Ares
- Artemis
- Orion
- Pegasus
- Pulse
- Ventture
- Zeus

---

## Observacao Importante

Esta operacao e irreversivel. Operacoes (`trading_operations`) que referenciam essas estrategias pelo nome continuarao no banco, mas a estrategia nao aparecera mais na lista de selecao.
