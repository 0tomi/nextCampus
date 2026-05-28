import { describe, it, expect } from 'vitest'
import {
  detectarRecurso,
  extraerYoutubeId,
  youtubeEmbedUrl,
  extraerDriveFileId,
  driveEmbedUrl,
  driveThumbnailUrl,
  inferDrivePreviewMode,
  nombreFallbackRecurso,
} from './recursos'

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

describe('extraerDriveFileId', () => {
  it('parsea drive.google.com/file/d/{ID}/view', () => {
    expect(
      extraerDriveFileId('https://drive.google.com/file/d/1aBcDeF_g-h/view'),
    ).toEqual({ kind: 'file', id: '1aBcDeF_g-h' })
  })

  it('parsea drive.google.com/open?id={ID}', () => {
    expect(
      extraerDriveFileId('https://drive.google.com/open?id=1aBcDeF_g-h'),
    ).toEqual({ kind: 'file', id: '1aBcDeF_g-h' })
  })

  it('parsea drive.google.com/uc?id={ID}', () => {
    expect(
      extraerDriveFileId('https://drive.google.com/uc?export=view&id=1aBcDeF_g-h'),
    ).toEqual({ kind: 'file', id: '1aBcDeF_g-h' })
  })

  it('parsea drive.google.com/thumbnail?id={ID}', () => {
    expect(
      extraerDriveFileId('https://drive.google.com/thumbnail?id=1aBcDeF_g-h&sz=w800'),
    ).toEqual({ kind: 'file', id: '1aBcDeF_g-h' })
  })

  it('preserva resourcekey cuando existe', () => {
    expect(
      extraerDriveFileId(
        'https://drive.google.com/file/d/1aBcDeF_g-h/view?resourcekey=0-testKey',
      ),
    ).toEqual({ kind: 'file', id: '1aBcDeF_g-h', resourceKey: '0-testKey' })
  })

  it('parsea docs.google.com/document/d/{ID}/edit', () => {
    expect(
      extraerDriveFileId('https://docs.google.com/document/d/1aBcDeF_g-h/edit'),
    ).toEqual({ kind: 'document', id: '1aBcDeF_g-h' })
  })

  it('parsea docs.google.com/spreadsheets/d/{ID}/edit', () => {
    expect(
      extraerDriveFileId(
        'https://docs.google.com/spreadsheets/d/1aBcDeF_g-h/edit',
      ),
    ).toEqual({ kind: 'spreadsheet', id: '1aBcDeF_g-h' })
  })

  it('parsea docs.google.com/presentation/d/{ID}/edit', () => {
    expect(
      extraerDriveFileId(
        'https://docs.google.com/presentation/d/1aBcDeF_g-h/edit',
      ),
    ).toEqual({ kind: 'presentation', id: '1aBcDeF_g-h' })
  })

  it('rechaza protocolo http', () => {
    expect(
      extraerDriveFileId('http://drive.google.com/file/d/abc123/view'),
    ).toBeNull()
  })

  it('rechaza host desconocido', () => {
    expect(
      extraerDriveFileId('https://evil.com/file/d/abc123/view'),
    ).toBeNull()
  })

  it('rechaza path desconocido en drive.google.com', () => {
    expect(extraerDriveFileId('https://drive.google.com/drive/u/0/my-drive'))
      .toBeNull()
  })

  it('rechaza URL malformada', () => {
    expect(extraerDriveFileId('not a url')).toBeNull()
  })

  it('rechaza ID con caracteres inválidos', () => {
    expect(
      extraerDriveFileId('https://drive.google.com/file/d/abc$123/view'),
    ).toBeNull()
  })
})

describe('driveEmbedUrl', () => {
  it('genera preview para file', () => {
    expect(driveEmbedUrl({ kind: 'file', id: 'abc123' })).toBe(
      'https://drive.google.com/file/d/abc123/preview',
    )
  })

  it('agrega resourcekey a la preview si corresponde', () => {
    expect(driveEmbedUrl({ kind: 'file', id: 'abc123', resourceKey: '0-key' })).toBe(
      'https://drive.google.com/file/d/abc123/preview?resourcekey=0-key',
    )
  })

  it('genera preview para document', () => {
    expect(driveEmbedUrl({ kind: 'document', id: 'abc123' })).toBe(
      'https://docs.google.com/document/d/abc123/preview',
    )
  })

  it('genera preview para spreadsheet', () => {
    expect(driveEmbedUrl({ kind: 'spreadsheet', id: 'abc123' })).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/preview',
    )
  })

  it('genera preview para presentation', () => {
    expect(driveEmbedUrl({ kind: 'presentation', id: 'abc123' })).toBe(
      'https://docs.google.com/presentation/d/abc123/preview',
    )
  })
})

describe('driveThumbnailUrl', () => {
  it('genera thumbnail para archivos de Drive', () => {
    expect(driveThumbnailUrl({ kind: 'file', id: 'abc123' }, 800)).toBe(
      'https://drive.google.com/thumbnail?id=abc123&sz=w800',
    )
  })

  it('preserva resourcekey en thumbnails', () => {
    expect(driveThumbnailUrl({ kind: 'file', id: 'abc123', resourceKey: '0-key' }, 800)).toBe(
      'https://drive.google.com/thumbnail?id=abc123&sz=w800&resourcekey=0-key',
    )
  })
})

describe('inferDrivePreviewMode', () => {
  it('embebe documentos nativos de Google', () => {
    expect(inferDrivePreviewMode({ kind: 'document', id: 'abc123' }, 'Resumen')).toBe('embed')
  })

  it('usa thumbnail para imágenes', () => {
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'foto.png')).toBe('thumbnail')
  })

  it('embebe PDFs y videos con extensión conocida', () => {
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'clase.pdf')).toBe('embed')
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'clase.mp4')).toBe('embed')
  })

  it('evita previews automáticas para HTML y PowerPoint', () => {
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'laboratorio.html')).toBe('fallback')
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'PPT de RNN')).toBe('fallback')
  })

  it('usa thumbnail para archivos Drive genéricos', () => {
    expect(inferDrivePreviewMode({ kind: 'file', id: 'abc123' }, 'Material')).toBe('thumbnail')
  })
})

describe('nombreFallbackRecurso', () => {
  it('YOUTUBE → "Video de YouTube"', () => {
    expect(nombreFallbackRecurso('YOUTUBE')).toBe('Video de YouTube')
  })

  it('DRIVE → "Archivo de Drive"', () => {
    expect(nombreFallbackRecurso('DRIVE')).toBe('Archivo de Drive')
  })
})
