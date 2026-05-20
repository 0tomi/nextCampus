import { describe, it, expect } from 'vitest'
import { detectarRecurso, extraerYoutubeId, youtubeEmbedUrl } from './recursos'

describe('detectarRecurso', () => {
  describe('YouTube', () => {
    it('detecta youtube.com/watch', () => {
      const r = detectarRecurso('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(r).toEqual({ tipo: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    })

    it('detecta youtu.be', () => {
      const r = detectarRecurso('https://youtu.be/dQw4w9WgXcQ')
      expect(r).toEqual({ tipo: 'YOUTUBE', url: 'https://youtu.be/dQw4w9WgXcQ' })
    })

    it('detecta m.youtube.com', () => {
      const r = detectarRecurso('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(r).toEqual({ tipo: 'YOUTUBE', url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ' })
    })

    it('detecta youtube.com sin www', () => {
      const r = detectarRecurso('https://youtube.com/watch?v=dQw4w9WgXcQ')
      expect(r).toEqual({ tipo: 'YOUTUBE', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
    })
  })

  describe('Drive', () => {
    it('detecta drive.google.com', () => {
      const r = detectarRecurso('https://drive.google.com/file/d/abc123/view')
      expect(r).toEqual({ tipo: 'DRIVE', url: 'https://drive.google.com/file/d/abc123/view' })
    })

    it('detecta docs.google.com', () => {
      const r = detectarRecurso('https://docs.google.com/document/d/abc123/edit')
      expect(r).toEqual({ tipo: 'DRIVE', url: 'https://docs.google.com/document/d/abc123/edit' })
    })
  })

  describe('rechazos', () => {
    it('rechaza http (no https)', () => {
      expect(detectarRecurso('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    })

    it('rechaza hostname con youtube como substring (evil.com/youtube)', () => {
      expect(detectarRecurso('https://evil.com/youtube/watch?v=abc')).toBeNull()
    })

    it('rechaza hostname youtubex.com', () => {
      expect(detectarRecurso('https://youtubex.com/watch?v=abc')).toBeNull()
    })

    it('rechaza URL malformada', () => {
      expect(detectarRecurso('not a url')).toBeNull()
    })

    it('rechaza dominio genérico', () => {
      expect(detectarRecurso('https://example.com')).toBeNull()
    })

    it('rechaza subdominio falso de youtube', () => {
      expect(detectarRecurso('https://fake.youtube.com.evil.com/watch?v=abc')).toBeNull()
    })
  })
})

describe('extraerYoutubeId', () => {
  const EXPECTED_ID = 'dQw4w9WgXcQ'

  it('extrae de youtube.com/watch?v=', () => {
    expect(extraerYoutubeId(`https://www.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
  })

  it('extrae de youtu.be/<id>', () => {
    expect(extraerYoutubeId(`https://youtu.be/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
  })

  it('extrae de youtube.com/shorts/<id>', () => {
    expect(extraerYoutubeId(`https://www.youtube.com/shorts/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
  })

  it('extrae de youtube.com/embed/<id>', () => {
    expect(extraerYoutubeId(`https://www.youtube.com/embed/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
  })

  it('extrae de youtube-nocookie.com/embed/<id>', () => {
    expect(extraerYoutubeId(`https://www.youtube-nocookie.com/embed/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
  })

  it('retorna null para URL sin id', () => {
    expect(extraerYoutubeId('https://www.youtube.com/feed/subscriptions')).toBeNull()
  })

  it('retorna null para URL malformada', () => {
    expect(extraerYoutubeId('not a url')).toBeNull()
  })

  it('retorna null para id con longitud incorrecta', () => {
    expect(extraerYoutubeId('https://youtu.be/cortoid')).toBeNull()
  })

  it('retorna null si no hay segmento después de /shorts/', () => {
    expect(extraerYoutubeId('https://www.youtube.com/shorts/')).toBeNull()
  })
})

describe('youtubeEmbedUrl', () => {
  it('genera URL de embed nocookie correcta', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })
})
