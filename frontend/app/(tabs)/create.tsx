import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import api from '../../utils/api';
import { Track } from '../../types';

export default function CreatePostScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [selectedSong, setSelectedSong] = useState<Track | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchSource, setSearchSource] = useState<'spotify' | 'youtube'>('spotify');
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);

  const searchMusic = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearching(true);
    try {
      console.log('Searching music:', searchSource, searchQuery);
      const endpoint = searchSource === 'spotify' ? '/spotify/search' : '/youtube/search';
      const response = await api.get(`${endpoint}?q=${searchQuery}`);
      console.log('Search results:', response.data.length, 'tracks');
      setSearchResults(response.data);
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to search music';
      Alert.alert('Search Error', errorMsg);
    } finally {
      setSearching(false);
    }
  };

  const selectSong = (track: Track) => {
    setSelectedSong(track);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handlePost = async () => {
    if (!selectedSong) {
      Alert.alert('Error', 'Please select a song first');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    setPosting(true);
    try {
      await api.post('/posts', {
        content: content.trim(),
        song_data: {
          title: selectedSong.title,
          artist: selectedSong.artist,
          album: selectedSong.album || '',
          image_url: selectedSong.image_url || '',
          preview_url: selectedSong.preview_url || '',
          source: selectedSong.source,
          track_id: selectedSong.id,
        },
      });

      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => {
          setContent('');
          setSelectedSong(null);
          router.push('/(tabs)');
        }},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const renderTrack = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackCard}
      onPress={() => selectSong(item)}
    >
      <Image
        source={item.image_url ? { uri: item.image_url } : require('../../assets/images/icon.png')}
        style={styles.trackImage}
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        {item.album && (
          <Text style={styles.trackAlbum} numberOfLines={1}>
            {item.album}
          </Text>
        )}
      </View>
      <View style={[styles.sourceBadge, item.source === 'youtube' && styles.youtubeBadge]}>
        <Text style={styles.sourceText}>
          {item.source === 'spotify' ? 'Spotify' : 'YouTube'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Post</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Song Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Select Song</Text>
            {selectedSong ? (
              <View style={styles.selectedSongCard}>
                <Image
                  source={selectedSong.image_url ? { uri: selectedSong.image_url } : require('../../assets/images/icon.png')}
                  style={styles.selectedSongImage}
                />
                <View style={styles.selectedSongInfo}>
                  <Text style={styles.selectedSongTitle} numberOfLines={1}>
                    {selectedSong.title}
                  </Text>
                  <Text style={styles.selectedSongArtist} numberOfLines={1}>
                    {selectedSong.artist}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSong(null)}>
                  <Ionicons name="close-circle" size={28} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowSearchModal(true)}
              >
                <Ionicons name="musical-notes" size={24} color="#1DB954" />
                <Text style={styles.selectButtonText}>Search for a song</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Caption Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#8e8e93"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Post Button */}
          <TouchableOpacity
            style={[styles.postButton, (!selectedSong || !content.trim() || posting) && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!selectedSong || !content.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Search Modal */}
        <Modal
          isVisible={showSearchModal}
          onBackdropPress={() => setShowSearchModal(false)}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Music</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Source Selector */}
            <View style={styles.sourceTabs}>
              <TouchableOpacity
                style={[styles.sourceTab, searchSource === 'spotify' && styles.activeSourceTab]}
                onPress={() => {
                  setSearchSource('spotify');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="logo-spotify" size={20} color={searchSource === 'spotify' ? '#fff' : '#8e8e93'} />
                <Text style={[styles.sourceTabText, searchSource === 'spotify' && styles.activeSourceTabText]}>
                  Spotify
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceTab, searchSource === 'youtube' && styles.activeSourceTab]}
                onPress={() => {
                  setSearchSource('youtube');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="logo-youtube" size={20} color={searchSource === 'youtube' ? '#fff' : '#8e8e93'} />
                <Text style={[styles.sourceTabText, searchSource === 'youtube' && styles.activeSourceTabText]}>
                  YouTube
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8e8e93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a song..."
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchMusic}
                autoFocus
              />
              {searching ? (
                <ActivityIndicator size="small" color="#1DB954" />
              ) : (
                <TouchableOpacity onPress={searchMusic}>
                  <Ionicons name="arrow-forward-circle" size={24} color="#1DB954" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderTrack}
              style={styles.resultsList}
              ListEmptyComponent={
                searchQuery.length > 0 && !searching ? (
                  <View style={styles.emptyResults}>
                    <Text style={styles.emptyText}>No results found</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DB954',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1DB954',
    borderStyle: 'dashed',
    gap: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1DB954',
    fontWeight: '600',
  },
  selectedSongCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
  },
  selectedSongImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  selectedSongInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedSongTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  selectedSongArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
  },
  postButton: {
    backgroundColor: '#1DB954',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  postButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sourceTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  activeSourceTab: {
    backgroundColor: '#1DB954',
  },
  sourceTabText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  activeSourceTabText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  resultsList: {
    flex: 1,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: '#b3b3b3',
    marginBottom: 2,
  },
  trackAlbum: {
    fontSize: 11,
    color: '#8e8e93',
  },
  sourceBadge: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youtubeBadge: {
    backgroundColor: '#FF0000',
  },
  sourceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyResults: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 14,
  },
});
