-- ============================================================
-- FIX: Atualizar opening stock records com tank_id = NULL
-- ============================================================
-- 🔥 Este script corrige os registros de tồn đầu que foram salvos sem tank_id
-- Problema: Quando opening stock é adicionado sem tank_id especificado,
-- o relatório não consegue associar corretamente ao tank (resultado: soma incorreta)

BEGIN TRANSACTION;

-- 1. Mostrar os registros com NULL tank_id antes da correção
SELECT 'ANTES DA CORREÇÃO - Registros com tank_id = NULL:' as info;
SELECT 
  il.id,
  il.warehouse_id,
  il.product_id,
  il.tank_id,
  il.ref_type,
  il.quantity_in,
  p.name as product_name
FROM inventory_ledger il
LEFT JOIN products p ON p.id = il.product_id
WHERE il.ref_type = 'ADJUSTMENT'
  AND il.shift_id IS NULL
  AND il.tank_id IS NULL
ORDER BY il.created_at DESC;

-- 2. Atualizar tank_id para os registros ADJUSTMENT sem tank
-- 🔥 Lógica: Para cada product_id sem tank_id, encontrar o tank ativo daquele product
UPDATE inventory_ledger il
SET tank_id = (
  SELECT t.id
  FROM tanks t
  WHERE t.product_id = il.product_id
    AND t.is_active = true
    AND t.store_id = (
      SELECT DISTINCT w.store_id
      FROM warehouses w
      WHERE w.id = il.warehouse_id
    )
  LIMIT 1
)
WHERE il.ref_type = 'ADJUSTMENT'
  AND il.shift_id IS NULL
  AND il.tank_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM tanks t
    WHERE t.product_id = il.product_id
      AND t.is_active = true
      AND t.store_id = (
        SELECT DISTINCT w.store_id
        FROM warehouses w
        WHERE w.id = il.warehouse_id
      )
  );

-- 3. Mostrar os registros após a correção
SELECT 'APÓS A CORREÇÃO - Registros atualizados com tank_id:' as info;
SELECT 
  il.id,
  il.warehouse_id,
  il.product_id,
  il.tank_id,
  t.tank_code,
  il.ref_type,
  il.quantity_in,
  p.name as product_name
FROM inventory_ledger il
LEFT JOIN products p ON p.id = il.product_id
LEFT JOIN tanks t ON t.id = il.tank_id
WHERE il.ref_type = 'ADJUSTMENT'
  AND il.shift_id IS NULL
ORDER BY il.created_at DESC;

-- 4. Verificar se ainda há registros ADJUSTMENT sem tank_id
SELECT 'VERIFICAÇÃO FINAL - Registros AINDA sem tank_id:' as info;
SELECT 
  COUNT(*) as count_without_tank_id
FROM inventory_ledger
WHERE ref_type = 'ADJUSTMENT'
  AND shift_id IS NULL
  AND tank_id IS NULL;

COMMIT;

-- Se tudo correr bem, os relatórios de nhập xuất tồn devem mostrar os valores corretos agora!
