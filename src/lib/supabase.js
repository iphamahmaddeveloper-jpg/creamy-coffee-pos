import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-supabase')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Service Helper for syncing offline/mock state with Supabase when configured
 */
export async function syncOrderToSupabase(orderPayload) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, source: 'local-state' };
  }

  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          id: orderPayload.id,
          invoice_number: orderPayload.invoiceNumber,
          cashier_id: orderPayload.cashierId,
          cashier_name: orderPayload.cashierName,
          table_id: orderPayload.tableId,
          table_name: orderPayload.tableName,
          customer_name: orderPayload.customerName,
          order_type: orderPayload.orderType,
          subtotal: orderPayload.subtotal,
          discount: orderPayload.discount,
          tax: orderPayload.tax,
          total: orderPayload.total,
          payment_method: orderPayload.paymentMethod,
          cash_tendered: orderPayload.cashTendered,
          change_returned: orderPayload.changeReturned,
          status: 'PAID'
        }
      ])
      .select();

    if (orderError) throw orderError;

    if (orderPayload.items && orderPayload.items.length > 0) {
      const itemsToInsert = orderPayload.items.map((item) => ({
        order_id: orderPayload.id,
        product_id: item.productId,
        product_name: item.name,
        price: item.price,
        quantity: item.qty,
        sugar_level: item.sugarLevel,
        ice_level: item.iceLevel,
        notes: item.notes,
        total_price: item.price * item.qty
      }));

      await supabase.from('order_items').insert(itemsToInsert);
    }

    return { ok: true, source: 'supabase', data: orderData };
  } catch (err) {
    console.warn('Supabase sync notice:', err.message);
    return { ok: false, error: err.message, source: 'local-fallback' };
  }
}

