import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { Card, Badge, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

interface HairStyle {
  id: string;
  name: string;
  category: string;
  length: string;
  tags: string[];
  description: string;
}

const mockHairStyles: HairStyle[] = [
  {
    id: '1',
    name: 'ナチュラルショートボブ',
    category: 'ボブ',
    length: 'ショート',
    tags: ['人気', '小顔効果', 'お手入れ簡単'],
    description: '清潔感のあるナチュラルなショートボブスタイル',
  },
  {
    id: '2',
    name: 'ゆるふわミディアム',
    category: 'ミディアム',
    length: 'ミディアム',
    tags: ['人気', 'デート向け'],
    description: '柔らかいウェーブが特徴のミディアムヘア',
  },
  {
    id: '3',
    name: 'エレガントロング',
    category: 'ロング',
    length: 'ロング',
    tags: ['艶髪', 'フォーマル向け'],
    description: '美しいツヤと毛流れのロングヘア',
  },
  {
    id: '4',
    name: 'カジュアルマッシュ',
    category: 'マッシュ',
    length: 'ショート',
    tags: ['トレンド', 'ユニセックス'],
    description: 'カジュアルで動きのあるマッシュスタイル',
  },
  {
    id: '5',
    name: 'パーマミディアム',
    category: 'パーマ',
    length: 'ミディアム',
    tags: ['ボリュームアップ', '華やか'],
    description: '程よいボリューム感のパーマスタイル',
  },
  {
    id: '6',
    name: 'レイヤーロング',
    category: 'レイヤー',
    length: 'ロング',
    tags: ['軽やか', '動きあり'],
    description: '軽やかな動きを出したレイヤースタイル',
  },
];

const categories = ['すべて', 'ショート', 'ミディアム', 'ロング', 'ボブ', 'パーマ'];

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing[4] * 3) / 2;

export default function GalleryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');

  const filteredStyles = mockHairStyles.filter((style) => {
    const matchesSearch =
      searchQuery === '' ||
      style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'すべて' ||
      style.category === selectedCategory ||
      style.length === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const renderStyleCard = ({ item }: { item: HairStyle }) => (
    <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.8}>
      <View style={styles.styleCard}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderIcon}>💇‍♀️</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.styleName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.styleDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={index}
                colorScheme={tag === '人気' ? 'primary' : 'neutral'}
                variant="subtle"
                size="sm"
                style={styles.tag}
              >
                {tag}
              </Badge>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="スタイル名、タグで検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Styles Grid */}
      <FlatList
        data={filteredStyles}
        renderItem={renderStyleCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>該当するスタイルが見つかりません</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  searchContainer: {
    backgroundColor: colors.white,
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: colors.neutral[900],
  },
  categoriesContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  categoriesContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  categoryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: colors.neutral[100],
  },
  categoryButtonActive: {
    backgroundColor: colors.primary[500],
  },
  categoryText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  categoryTextActive: {
    color: colors.white,
  },
  gridContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: spacing[4],
  },
  styleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imagePlaceholder: {
    backgroundColor: colors.neutral[100],
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  cardContent: {
    padding: spacing[3],
  },
  styleName: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  styleDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
});
