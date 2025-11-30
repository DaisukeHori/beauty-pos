import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

export default function SimulationScreen() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hairStyles = [
    { id: '1', name: 'ショートボブ', image: null },
    { id: '2', name: 'ミディアムレイヤー', image: null },
    { id: '3', name: 'ロングウェーブ', image: null },
    { id: '4', name: 'ツーブロック', image: null },
    { id: '5', name: 'マッシュショート', image: null },
    { id: '6', name: 'レイヤーカット', image: null },
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSourceImage(result.assets[0].uri);
      setGeneratedImage(null);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('カメラの許可が必要です', 'カメラを使用するには許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSourceImage(result.assets[0].uri);
      setGeneratedImage(null);
    }
  };

  const generateSimulation = async () => {
    if (!sourceImage || !selectedStyle) {
      Alert.alert('選択が必要です', '写真とヘアスタイルを選択してください。');
      return;
    }

    setIsProcessing(true);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // In real implementation, this would call the AI service
    setGeneratedImage(sourceImage); // For now, just show the same image
    setIsProcessing(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. あなたの写真を選択</Text>

        {sourceImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: sourceImage }} style={styles.selectedImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => setSourceImage(null)}
            >
              <Text style={styles.changeImageText}>変更</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>写真を撮る</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonIcon}>🖼️</Text>
              <Text style={styles.photoButtonText}>アルバムから選択</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Style Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 試したいヘアスタイルを選択</Text>
        <View style={styles.stylesGrid}>
          {hairStyles.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[
                styles.styleCard,
                selectedStyle === style.id && styles.styleCardSelected,
              ]}
              onPress={() => setSelectedStyle(style.id)}
            >
              <View style={styles.stylePlaceholder}>
                <Text style={styles.stylePlaceholderIcon}>💇</Text>
              </View>
              <Text style={styles.styleName}>{style.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Button */}
      <View style={styles.section}>
        <Button
          onPress={generateSimulation}
          isLoading={isProcessing}
          isDisabled={!sourceImage || !selectedStyle}
          size="lg"
          fullWidth
        >
          {isProcessing ? 'シミュレーション中...' : 'シミュレーションを生成'}
        </Button>
      </View>

      {/* Result */}
      {generatedImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>シミュレーション結果</Text>
          <Card variant="elevated" size="lg">
            <View style={styles.resultContainer}>
              <Image source={{ uri: generatedImage }} style={styles.resultImage} />
              <Text style={styles.resultNote}>
                ※ これはAIによるシミュレーションです。
                実際の仕上がりと異なる場合があります。
              </Text>
            </View>
            <View style={styles.resultActions}>
              <Button
                variant="outline"
                size="md"
                onPress={() => {}}
                style={styles.resultButton}
              >
                保存する
              </Button>
              <Button
                size="md"
                onPress={() => {}}
                style={styles.resultButton}
              >
                このスタイルで決定
              </Button>
            </View>
          </Card>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    marginHorizontal: spacing[1],
    ...shadows.sm,
  },
  photoButtonIcon: {
    fontSize: 40,
    marginBottom: spacing[2],
  },
  photoButtonText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 200,
    height: 260,
    borderRadius: borderRadius.xl,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: spacing[2],
    right: '25%',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  changeImageText: {
    ...textStyles.labelSm,
    color: colors.primary[500],
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  styleCard: {
    width: '33.33%',
    padding: spacing[1],
  },
  styleCardSelected: {},
  stylePlaceholder: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stylePlaceholderIcon: {
    fontSize: 32,
  },
  styleName: {
    ...textStyles.caption,
    color: colors.neutral[700],
    textAlign: 'center',
    marginTop: spacing[1],
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  resultNote: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
  resultButton: {
    flex: 1,
    marginHorizontal: spacing[1],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
