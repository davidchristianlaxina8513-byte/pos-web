import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SearchBar } from '@/components/common/SearchBar/SearchBar';
import { InputField } from '@/components/common/InputField/InputField';
import { useAuth } from '@/context/AuthContext';
import { toErrorMessage } from '@/services/errors';
import { ReorderRequestRow } from '@/api/reorderApi';
import {
  useReorderRequests,
  UseReorderRequestsResult,
} from '@/features/admin/inventory-management/hooks/useReorderRequests';
import { restockRequestsStyles } from './RestockRequests.styles';

type RestockRequestsProps = {
  style?: StyleProp<ViewStyle>;
};

function StatusPill({
  status,
}: {
  status: ReorderRequestRow['status'];
}): React.JSX.Element {
  return (
    <View style={restockRequestsStyles.statusPill}>
      <Text style={restockRequestsStyles.statusPillText}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

function RestockRequestCard({
  item,
  actions,
}: {
  item: ReorderRequestRow;
  actions: Pick<
    UseReorderRequestsResult,
    'saveQuantity' | 'saveSupplier' | 'markOrdered' | 'resolveRequest'
  >;
}): React.JSX.Element {
  const [quantityText, setQuantityText] = useState(
    String(item.suggested_quantity),
  );
  const [supplierText, setSupplierText] = useState(item.supplier ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(
    async (work: () => Promise<void>): Promise<void> => {
      if (isSaving) return;
      setError('');
      setIsSaving(true);
      try {
        await work();
      } catch (err) {
        setError(toErrorMessage(err, 'Could not save'));
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving],
  );

  const quantity = parseInt(quantityText, 10);

  return (
    <View style={restockRequestsStyles.itemCard}>
      <View style={restockRequestsStyles.itemHeader}>
        <Text style={restockRequestsStyles.itemName} numberOfLines={1}>
          {item.product_name}
        </Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={restockRequestsStyles.statLine}>
        On hand {item.current_stock_snapshot} · reorder at{' '}
        {item.reorder_point_snapshot} · par {item.par_level_snapshot}
      </Text>

      <Text style={restockRequestsStyles.inputLabel}>Suggested quantity</Text>
      <View style={restockRequestsStyles.inlineRow}>
        <InputField
          value={quantityText}
          onChangeText={setQuantityText}
          keyboardType="number-pad"
          placeholder="0"
          disabled={isSaving}
          style={restockRequestsStyles.inlineInput}
        />
        <Pressable
          style={({ pressed }) => [
            restockRequestsStyles.smallButton,
            pressed ? restockRequestsStyles.smallButtonPressed : null,
          ]}
          disabled={isSaving || !Number.isInteger(quantity) || quantity < 0}
          onPress={() =>
            void run(() => actions.saveQuantity(item.request_id, quantity))
          }
        >
          <Text style={restockRequestsStyles.smallButtonText}>Save</Text>
        </Pressable>
      </View>

      <Text style={restockRequestsStyles.inputLabel}>Supplier</Text>
      <View style={restockRequestsStyles.inlineRow}>
        <InputField
          value={supplierText}
          onChangeText={setSupplierText}
          placeholder="Supplier name"
          autoCapitalize="words"
          autoCorrect={false}
          disabled={isSaving}
          style={restockRequestsStyles.inlineInput}
        />
        <Pressable
          style={({ pressed }) => [
            restockRequestsStyles.smallButton,
            pressed ? restockRequestsStyles.smallButtonPressed : null,
          ]}
          disabled={isSaving}
          onPress={() =>
            void run(() =>
              actions.saveSupplier(
                item.request_id,
                supplierText.trim() === '' ? null : supplierText.trim(),
              ),
            )
          }
        >
          <Text style={restockRequestsStyles.smallButtonText}>Save</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={restockRequestsStyles.errorText}>{error}</Text>
      ) : null}

      <View style={restockRequestsStyles.actionRow}>
        {item.status === 'pending' ? (
          <Pressable
            style={({ pressed }) => [
              restockRequestsStyles.actionButton,
              pressed ? restockRequestsStyles.actionButtonPressed : null,
            ]}
            disabled={isSaving}
            onPress={() => void run(() => actions.markOrdered(item.request_id))}
          >
            <Text style={restockRequestsStyles.actionButtonText}>Ordered</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            restockRequestsStyles.actionButton,
            restockRequestsStyles.actionButtonPrimary,
            pressed ? restockRequestsStyles.actionButtonPressed : null,
          ]}
          disabled={isSaving}
          onPress={() =>
            void run(() => actions.resolveRequest(item.request_id, 'received'))
          }
        >
          <Text style={restockRequestsStyles.actionButtonText}>Received</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            restockRequestsStyles.actionButton,
            pressed ? restockRequestsStyles.actionButtonPressed : null,
          ]}
          disabled={isSaving}
          onPress={() =>
            void run(() => actions.resolveRequest(item.request_id, 'cancelled'))
          }
        >
          <Text style={restockRequestsStyles.actionButtonText}>Cancel</Text>
        </Pressable>
      </View>
      {isSaving ? <ActivityIndicator /> : null}
    </View>
  );
}

export function RestockRequests({
  style,
}: RestockRequestsProps): React.JSX.Element {
  const { role } = useAuth();
  const {
    groups,
    openCount,
    isLoading,
    error,
    loadRequests,
    saveQuantity,
    saveSupplier,
    markOrdered,
    resolveRequest,
    shareList,
  } = useReorderRequests();
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  if (role !== 'admin') {
    return (
      <View style={[restockRequestsStyles.container, style]}>
        <Text style={restockRequestsStyles.errorText}>
          Admin access required
        </Text>
      </View>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((item) =>
        item.product_name.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.rows.length > 0);

  const actions = { saveQuantity, saveSupplier, markOrdered, resolveRequest };

  return (
    <View style={[restockRequestsStyles.container, style]}>
      <View style={restockRequestsStyles.summaryCard}>
        <Text style={restockRequestsStyles.summaryLabel}>Open requests</Text>
        <Text style={restockRequestsStyles.summaryValue}>{openCount}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          restockRequestsStyles.shareButton,
          pressed ? restockRequestsStyles.shareButtonPressed : null,
        ]}
        disabled={openCount === 0}
        onPress={() => void shareList()}
      >
        <Text style={restockRequestsStyles.shareButtonText}>
          Share supplier list
        </Text>
      </Pressable>

      {error ? (
        <Text style={restockRequestsStyles.errorText}>{error}</Text>
      ) : null}

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by product name"
        style={restockRequestsStyles.searchBar}
      />

      {isLoading && openCount === 0 ? (
        <Text style={restockRequestsStyles.loadingText}>
          Loading restock requests...
        </Text>
      ) : null}

      <FlatList
        data={visibleGroups}
        keyExtractor={(group) => group.supplier}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={restockRequestsStyles.content}
        renderItem={({ item: group }) => (
          <View>
            <Text style={restockRequestsStyles.supplierHeader}>
              {group.supplier}
            </Text>
            {group.rows.map((item) => (
              <RestockRequestCard
                key={item.request_id}
                item={item}
                actions={actions}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}
