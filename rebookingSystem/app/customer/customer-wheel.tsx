import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;

interface WheelPickerProps {
  data: string[];
  onSelect: (value: string) => void;
  initialValue: string;
  width?: number;
}

const CustomWheelPicker: FC<WheelPickerProps> = ({ data, onSelect, initialValue, width = 60 }) => {
  const initialIndex = data.indexOf(initialValue);

  return (
    <View style={[styles.container, { width }]}>
      <FlatList
        key={initialValue}
        data={data}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={initialIndex !== -1 ? initialIndex : 0}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (data[index]) {
            onSelect(data[index]);
          }
        }}
        contentContainerStyle={{
          paddingVertical: (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT,
        }}
      />
      <LinearGradient
        colors={['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
  },
});

export default CustomWheelPicker;