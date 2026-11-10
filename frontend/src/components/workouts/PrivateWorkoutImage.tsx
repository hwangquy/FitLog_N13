import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';
import { API_BASE_URL } from '../../config/env';
import { getAccessToken } from '../../services/session';

/** Private media endpoint requires Bearer; web preview loads an authorized blob URL. */
export function PrivateWorkoutImage({image, style, onError, label}: {
  image: string; style: StyleProp<ImageStyle>; onError?: () => void; label?: string
}) {
  const [token, setToken] = useState<string | null>(null);
  const [webUri, setWebUri] = useState<string | null>(null);
  const isPrivate = image.startsWith('/media/');
  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    if (isPrivate) {
      getAccessToken().then(async t => {
        if (!live) return;
        setToken(t);
        if (Platform.OS === 'web' && t) {
          try {
            const r = await fetch(`${API_BASE_URL}${image}`, {headers: {Authorization:`Bearer ${t}`}});
            if (!r.ok) throw new Error('Cannot load image');
            const blob = await r.blob();
            if (!live) return;
            objectUrl = URL.createObjectURL(blob); setWebUri(objectUrl);
          } catch { if (live) onError?.(); }
        }
      }).catch(() => {if (live) onError?.();});
    }
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image, isPrivate]);
  const source = !isPrivate ? {uri:image} :
    Platform.OS === 'web' ? (webUri ? {uri:webUri} : undefined) :
    token ? {uri:`${API_BASE_URL}${image}`,headers:{Authorization:`Bearer ${token}`}} : undefined;
  if (!source) return null;
  return <Image source={source} accessibilityLabel={label || 'Ảnh buổi tập'} style={style} resizeMode="cover" onError={onError}/>;
}
