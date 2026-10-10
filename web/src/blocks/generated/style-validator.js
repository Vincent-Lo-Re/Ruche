// Généré par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier.
var __getOwnPropNames = Object.getOwnPropertyNames
var __commonJS = (cb, mod) =>
  function __require() {
    try {
      return (
        mod ||
          (0, cb[__getOwnPropNames(cb)[0]])(
            (mod = { exports: {} }).exports,
            mod
          ),
        mod.exports
      )
    } catch (e) {
      throw ((mod = 0), e)
    }
  }

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict"
    Object.defineProperty(exports, "__esModule", { value: true })
    function ucs2length(str) {
      const len = str.length
      let length = 0
      let pos = 0
      let value
      while (pos < len) {
        length++
        value = str.charCodeAt(pos++)
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos)
          if ((value & 64512) === 56320) pos++
        }
      }
      return length
    }
    exports.default = ucs2length
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default'
  },
})

// style-validator.raw.mjs
var validateStyle = validate177
var schema111 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://github.com/Vincent-Lo-Re/Ruche/blob/main/blocks/generated/style.schema.json",
  $comment:
    "G\xE9n\xE9r\xE9 par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier. Variante \xAB style \xBB. Variante \xAB style \xBB : la charte graphique de l'app (ADMIN \xA7 1, section \xAB App \xBB), un seul document. Rang\xE9e avec les blocs parce qu'elle les habille, dans l'app comme dans l'aper\xE7u de l'admin. Les r\xE9f\xE9rences (une couleur ou une police de la liste) et les noms en double se v\xE9rifient \xE0 part : private.style_problems dans la base, styleProblems dans l'admin.",
  type: "object",
  additionalProperties: false,
  required: [
    "v",
    "darkMode",
    "colors",
    "roles",
    "tints",
    "badges",
    "buttons",
    "fields",
    "fonts",
    "fontRoles",
    "sizes",
    "radius",
    "imageRadius",
    "shadow",
    "underlineLinks",
  ],
  properties: {
    v: { const: 1 },
    darkMode: { enum: ["auto", "light", "dark"] },
    colors: {
      type: "array",
      minItems: 1,
      maxItems: 60,
      items: { $ref: "#/definitions/styleColor" },
    },
    roles: { $ref: "#/definitions/styleColorRoles" },
    tints: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: { $ref: "#/definitions/styleTint" },
    },
    badges: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: { $ref: "#/definitions/styleBadge" },
    },
    buttons: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: { $ref: "#/definitions/styleButton" },
    },
    fields: { enum: ["outline", "filled", "underline"] },
    fonts: {
      type: "array",
      minItems: 3,
      maxItems: 12,
      items: { $ref: "#/definitions/styleFont" },
    },
    fontRoles: { $ref: "#/definitions/styleFontRoles" },
    sizes: { $ref: "#/definitions/styleSizes" },
    radius: { type: "integer", minimum: 0, maximum: 24 },
    imageRadius: { type: "integer", minimum: 0, maximum: 24 },
    shadow: { enum: ["none", "light", "medium", "strong"] },
    underlineLinks: { type: "boolean" },
  },
  definitions: {
    uuid: {
      $comment: "UUID en minuscules, comme crypto.randomUUID() et uuid::text.",
      type: "string",
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    },
    nullableUuid: {
      type: ["string", "null"],
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    },
    mediaRef: {
      $comment:
        "R\xE9f\xE9rence \xE0 un fichier de la m\xE9diath\xE8que (image de pr\xE9sentation, son d'un \xE9pisode), ou null. Toute r\xE9f\xE9rence de fichier s'appelle mediaId ([D9]).",
      type: ["object", "null"],
      additionalProperties: false,
      required: ["mediaId"],
      properties: { mediaId: { $ref: "#/definitions/uuid" } },
    },
    href: {
      $comment:
        "Liens https:// et mailto: seulement ([D10]), sensible \xE0 la casse, sans espace.",
      type: "string",
      maxLength: 2048,
      pattern: "^(https://|mailto:)[^\\s]+$",
    },
    basicMark: {
      type: "object",
      additionalProperties: false,
      required: ["type"],
      properties: { type: { enum: ["bold", "italic"] } },
    },
    linkMark: {
      type: "object",
      additionalProperties: false,
      required: ["type", "attrs"],
      properties: {
        type: { const: "link" },
        attrs: {
          type: "object",
          additionalProperties: false,
          required: ["href"],
          properties: { href: { $ref: "#/definitions/href" } },
        },
      },
    },
    mark: {
      tsType: "BasicMark | LinkMark",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "link" } },
      },
      then: { $ref: "#/definitions/linkMark" },
      else: { $ref: "#/definitions/basicMark" },
    },
    marks: { type: "array", items: { $ref: "#/definitions/mark" } },
    textNode: {
      type: "object",
      additionalProperties: false,
      required: ["type", "text"],
      properties: {
        type: { const: "text" },
        text: { type: "string", minLength: 1 },
        marks: { $ref: "#/definitions/marks" },
      },
    },
    hardBreak: {
      type: "object",
      additionalProperties: false,
      required: ["type"],
      properties: {
        type: { const: "hardBreak" },
        marks: { $ref: "#/definitions/marks" },
      },
    },
    inlineNode: {
      tsType: "TextNode | HardBreak",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/textNode" },
      else: { $ref: "#/definitions/hardBreak" },
    },
    inline: { type: "array", items: { $ref: "#/definitions/inlineNode" } },
    paragraph: {
      type: "object",
      additionalProperties: false,
      required: ["type"],
      properties: {
        type: { const: "paragraph" },
        content: { $ref: "#/definitions/inline" },
      },
    },
    heading: {
      $comment:
        "Niveaux 2 et 3 seulement : le titre du contenu fait office de niveau 1.",
      type: "object",
      additionalProperties: false,
      required: ["type", "attrs"],
      properties: {
        type: { const: "heading" },
        attrs: {
          type: "object",
          additionalProperties: false,
          required: ["level"],
          properties: { level: { enum: [2, 3] } },
        },
        content: { $ref: "#/definitions/inline" },
      },
    },
    bulletList: {
      type: "object",
      additionalProperties: false,
      required: ["type", "content"],
      properties: {
        type: { const: "bulletList" },
        content: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/definitions/listItem" },
        },
      },
    },
    orderedList: {
      $comment:
        "Seul l'attribut start est gard\xE9 (le type \xAB a \xBB, \xAB i \xBB\u2026 est un choix d'affichage).",
      type: "object",
      additionalProperties: false,
      required: ["type", "content"],
      properties: {
        type: { const: "orderedList" },
        attrs: {
          type: "object",
          additionalProperties: false,
          properties: {
            start: { type: "integer", minimum: 1, maximum: 99999 },
          },
        },
        content: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/definitions/listItem" },
        },
      },
    },
    listItem: {
      $comment:
        "Premier enfant : un paragraphe ; ensuite des paragraphes ou des listes (pas de titre).",
      type: "object",
      additionalProperties: false,
      required: ["type", "content"],
      properties: {
        type: { const: "listItem" },
        content: {
          type: "array",
          minItems: 1,
          items: [{ $ref: "#/definitions/paragraph" }],
          additionalItems: { $ref: "#/definitions/listChild" },
        },
      },
    },
    listChild: {
      tsType: "Paragraph | BulletList | OrderedList",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "paragraph" } },
      },
      then: { $ref: "#/definitions/paragraph" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "bulletList" } },
        },
        then: { $ref: "#/definitions/bulletList" },
        else: {
          if: {
            type: "object",
            required: ["type"],
            properties: { type: { const: "orderedList" } },
          },
          then: { $ref: "#/definitions/orderedList" },
          else: {
            type: "object",
            required: ["type"],
            properties: {
              type: { enum: ["paragraph", "bulletList", "orderedList"] },
            },
          },
        },
      },
    },
    docChild: {
      tsType: "Paragraph | Heading | BulletList | OrderedList",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "paragraph" } },
      },
      then: { $ref: "#/definitions/paragraph" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "heading" } },
        },
        then: { $ref: "#/definitions/heading" },
        else: {
          if: {
            type: "object",
            required: ["type"],
            properties: { type: { const: "bulletList" } },
          },
          then: { $ref: "#/definitions/bulletList" },
          else: {
            if: {
              type: "object",
              required: ["type"],
              properties: { type: { const: "orderedList" } },
            },
            then: { $ref: "#/definitions/orderedList" },
            else: {
              type: "object",
              required: ["type"],
              properties: {
                type: {
                  enum: ["paragraph", "heading", "bulletList", "orderedList"],
                },
              },
            },
          },
        },
      },
    },
    doc: {
      $comment: "JSON ProseMirror (format Tiptap) restreint.",
      type: "object",
      additionalProperties: false,
      required: ["type", "content"],
      properties: {
        type: { const: "doc" },
        content: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/definitions/docChild" },
        },
      },
    },
    textBlock: {
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "doc"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "text" },
        doc: { $ref: "#/definitions/doc" },
      },
    },
    imageBlock: {
      $comment:
        "mediaId null : image pas encore choisie. alt null : reprendre le texte alternatif de la m\xE9diath\xE8que. L\xE9gende : texte simple, 300 caract\xE8res au plus ([D34]), compt\xE9s en points de code.",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "mediaId", "caption", "alt"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "image" },
        mediaId: { $ref: "#/definitions/nullableUuid" },
        caption: { type: ["string", "null"], maxLength: 300 },
        alt: { type: ["string", "null"], maxLength: 1e3 },
      },
    },
    boxBlock: {
      $comment:
        "Encadr\xE9 : un seul niveau, Texte et Image seulement (ni encadr\xE9, ni bloc li\xE9).",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "look", "blocks"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "box" },
        look: { enum: ["fill", "border"] },
        blocks: { type: "array", items: { $ref: "#/definitions/boxChild" } },
      },
    },
    boxChild: {
      tsType: "TextBlock | ImageBlock",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/textBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "image" } },
        },
        then: { $ref: "#/definitions/imageBlock" },
        else: {
          type: "object",
          required: ["type"],
          properties: { type: { enum: ["text", "image"] } },
        },
      },
    },
    linkedBlock: {
      $comment:
        "Bloc partag\xE9 (mod\xE8le \xAB shared \xBB) : au premier niveau d'un brouillon de contenu seulement.",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "templateId"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "linked" },
        templateId: { $ref: "#/definitions/uuid" },
      },
    },
    topBlock: {
      $comment: "Un bloc au premier niveau d'un brouillon de contenu.",
      tsType: "TextBlock | ImageBlock | BoxBlock | LinkedBlock",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/textBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "image" } },
        },
        then: { $ref: "#/definitions/imageBlock" },
        else: {
          if: {
            type: "object",
            required: ["type"],
            properties: { type: { const: "box" } },
          },
          then: { $ref: "#/definitions/boxBlock" },
          else: {
            if: {
              type: "object",
              required: ["type"],
              properties: { type: { const: "linked" } },
            },
            then: { $ref: "#/definitions/linkedBlock" },
            else: {
              type: "object",
              required: ["type"],
              properties: {
                type: { enum: ["text", "image", "box", "linked"] },
              },
            },
          },
        },
      },
    },
    templateBlock: {
      $comment:
        "Un bloc au premier niveau d'un mod\xE8le : pas de bloc li\xE9 (ni cha\xEEne ni boucle).",
      tsType: "TextBlock | ImageBlock | BoxBlock",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/textBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "image" } },
        },
        then: { $ref: "#/definitions/imageBlock" },
        else: {
          if: {
            type: "object",
            required: ["type"],
            properties: { type: { const: "box" } },
          },
          then: { $ref: "#/definitions/boxBlock" },
          else: {
            type: "object",
            required: ["type"],
            properties: { type: { enum: ["text", "image", "box"] } },
          },
        },
      },
    },
    publishedImageBlock: {
      $comment:
        "Image d'une version publi\xE9e (dans un encadr\xE9) : fichier obligatoire, texte alternatif r\xE9solu (\xA7 2.4). altFromLibrary : ce texte vient de la m\xE9diath\xE8que (alt null dans le brouillon) ; \xAB Revenir \xE0 cette version \xBB remet alt \xE0 null. L'app l'ignore.",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "mediaId", "caption", "alt"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "image" },
        mediaId: { $ref: "#/definitions/uuid" },
        caption: { type: ["string", "null"], maxLength: 300 },
        alt: { type: "string", maxLength: 1e3 },
        altFromLibrary: { const: true },
      },
    },
    publishedBoxChild: {
      tsType: "TextBlock | PublishedImageBlock",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/textBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "image" } },
        },
        then: { $ref: "#/definitions/publishedImageBlock" },
        else: {
          type: "object",
          required: ["type"],
          properties: { type: { enum: ["text", "image"] } },
        },
      },
    },
    publishedTextBlock: {
      $comment:
        "Texte au premier niveau d'une version publi\xE9e. templateId : copie d'un bloc partag\xE9 (mod\xE8le \xAB shared \xBB), r\xE9solue \xE0 la publication (\xA7 2.4).",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "doc"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "text" },
        doc: { $ref: "#/definitions/doc" },
        templateId: { $ref: "#/definitions/uuid" },
      },
    },
    publishedTopImageBlock: {
      $comment:
        "Image au premier niveau d'une version publi\xE9e (comme publishedImageBlock), avec le marqueur templateId d'une copie de mod\xE8le.",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "mediaId", "caption", "alt"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "image" },
        mediaId: { $ref: "#/definitions/uuid" },
        caption: { type: ["string", "null"], maxLength: 300 },
        alt: { type: "string", maxLength: 1e3 },
        altFromLibrary: { const: true },
        templateId: { $ref: "#/definitions/uuid" },
      },
    },
    publishedBoxBlock: {
      $comment:
        "Encadr\xE9 d'une version publi\xE9e : Texte et Image (fichier obligatoire) seulement, avec le marqueur templateId d'une copie de mod\xE8le.",
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "look", "blocks"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        type: { const: "box" },
        look: { enum: ["fill", "border"] },
        blocks: {
          type: "array",
          items: { $ref: "#/definitions/publishedBoxChild" },
        },
        templateId: { $ref: "#/definitions/uuid" },
      },
    },
    publishedTopBlock: {
      $comment:
        "Un bloc au premier niveau d'une version publi\xE9e : jamais de bloc li\xE9 (il est r\xE9solu en copie).",
      tsType: "PublishedTextBlock | PublishedTopImageBlock | PublishedBoxBlock",
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "text" } },
      },
      then: { $ref: "#/definitions/publishedTextBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "image" } },
        },
        then: { $ref: "#/definitions/publishedTopImageBlock" },
        else: {
          if: {
            type: "object",
            required: ["type"],
            properties: { type: { const: "box" } },
          },
          then: { $ref: "#/definitions/publishedBoxBlock" },
          else: {
            type: "object",
            required: ["type"],
            properties: { type: { enum: ["text", "image", "box"] } },
          },
        },
      },
    },
    styleName: {
      $comment:
        "Nom donn\xE9 par le client (couleur, teinte, pastille, bouton, police) : 1 \xE0 40 caract\xE8res, sans espace autour.",
      type: "string",
      minLength: 1,
      maxLength: 40,
      pattern: "^\\S(.*\\S)?$",
    },
    styleHex: {
      $comment: "Une couleur \xAB #rrggbb \xBB, en minuscules.",
      type: "string",
      pattern: "^#[0-9a-f]{6}$",
    },
    styleColor: {
      title: "StyleColor",
      $comment:
        "Une couleur de la palette : sa valeur en mode clair et en mode sombre.",
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "light", "dark"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        name: { $ref: "#/definitions/styleName" },
        light: { $ref: "#/definitions/styleHex" },
        dark: { $ref: "#/definitions/styleHex" },
      },
    },
    styleColorRoles: {
      title: "StyleColorRoles",
      $comment:
        "O\xF9 va chaque couleur : l'identifiant d'une couleur de la palette pour chaque usage de l'app. Un usage ajout\xE9 plus tard sera facultatif, pour qu'une charte d\xE9j\xE0 enregistr\xE9e reste valable.",
      type: "object",
      additionalProperties: false,
      required: [
        "background",
        "card",
        "border",
        "text",
        "muted",
        "link",
        "primary",
        "topBar",
        "topBarText",
        "tabBar",
        "tabOn",
        "tabOff",
        "focus",
        "success",
        "warning",
        "error",
      ],
      properties: {
        background: { $ref: "#/definitions/uuid" },
        card: { $ref: "#/definitions/uuid" },
        border: { $ref: "#/definitions/uuid" },
        text: { $ref: "#/definitions/uuid" },
        muted: { $ref: "#/definitions/uuid" },
        link: { $ref: "#/definitions/uuid" },
        primary: { $ref: "#/definitions/uuid" },
        topBar: { $ref: "#/definitions/uuid" },
        topBarText: { $ref: "#/definitions/uuid" },
        tabBar: { $ref: "#/definitions/uuid" },
        tabOn: { $ref: "#/definitions/uuid" },
        tabOff: { $ref: "#/definitions/uuid" },
        focus: { $ref: "#/definitions/uuid" },
        success: { $ref: "#/definitions/uuid" },
        warning: { $ref: "#/definitions/uuid" },
        error: { $ref: "#/definitions/uuid" },
      },
    },
    styleTint: {
      title: "StyleTint",
      $comment:
        "Une teinte d'encadr\xE9 : chaque partie est une couleur de la palette.",
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "fill", "border", "title", "text", "link"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        name: { $ref: "#/definitions/styleName" },
        fill: { $ref: "#/definitions/uuid" },
        border: { $ref: "#/definitions/uuid" },
        title: { $ref: "#/definitions/uuid" },
        text: { $ref: "#/definitions/uuid" },
        link: { $ref: "#/definitions/uuid" },
      },
    },
    styleBadge: {
      title: "StyleBadge",
      $comment:
        "Une pastille (cat\xE9gorie, \xAB Abonn\xE9s \xBB\u2026) : la premi\xE8re sert aux cat\xE9gories.",
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "fill", "border", "text"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        name: { $ref: "#/definitions/styleName" },
        fill: { $ref: "#/definitions/uuid" },
        border: { $ref: "#/definitions/uuid" },
        text: { $ref: "#/definitions/uuid" },
      },
    },
    styleButton: {
      title: "StyleButton",
      $comment:
        "Un bouton : aplat (fill), d\xE9grad\xE9 (de fill \xE0 end), bordure (border) ou texte seul ; label est la couleur du texte. Toutes les couleurs restent, m\xEAme celles que le style n'emploie pas : changer de style ne perd rien. rounded : l'arrondi de la charte. Le premier sert aux boutons de l'app.",
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "name",
        "kind",
        "shape",
        "fill",
        "end",
        "border",
        "label",
      ],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        name: { $ref: "#/definitions/styleName" },
        kind: { enum: ["flat", "gradient", "outline", "text"] },
        shape: { enum: ["rounded", "pill", "square"] },
        fill: { $ref: "#/definitions/uuid" },
        end: { $ref: "#/definitions/uuid" },
        border: { $ref: "#/definitions/uuid" },
        label: { $ref: "#/definitions/uuid" },
      },
    },
    styleFont: {
      title: "StyleFont",
      $comment:
        "Une police : system (celle du t\xE9l\xE9phone) ou une police libre de Google Fonts, copi\xE9e dans le stockage de l'installation. On ne fait qu'ajouter des familles ; les \xE9paisseurs de chacune sont dans l'admin.",
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "family", "weight"],
      properties: {
        id: { $ref: "#/definitions/uuid" },
        name: { $ref: "#/definitions/styleName" },
        family: {
          enum: [
            "system",
            "DM Sans",
            "DM Serif Display",
            "Fraunces",
            "Inter",
            "Libre Baskerville",
            "Lora",
            "Merriweather",
            "Nunito",
            "Playfair Display",
            "Poppins",
            "Source Serif 4",
            "Space Grotesk",
            "Work Sans",
          ],
        },
        weight: { enum: [400, 500, 600, 700] },
      },
    },
    styleFontRoles: {
      title: "StyleFontRoles",
      $comment:
        "O\xF9 va chaque police : l'identifiant d'une police de la liste pour chaque usage.",
      type: "object",
      additionalProperties: false,
      required: [
        "brand",
        "title",
        "heading",
        "body",
        "quote",
        "small",
        "boxTitle",
        "button",
        "tabs",
      ],
      properties: {
        brand: { $ref: "#/definitions/uuid" },
        title: { $ref: "#/definitions/uuid" },
        heading: { $ref: "#/definitions/uuid" },
        body: { $ref: "#/definitions/uuid" },
        quote: { $ref: "#/definitions/uuid" },
        small: { $ref: "#/definitions/uuid" },
        boxTitle: { $ref: "#/definitions/uuid" },
        button: { $ref: "#/definitions/uuid" },
        tabs: { $ref: "#/definitions/uuid" },
      },
    },
    styleSize: {
      title: "StyleSize",
      $comment:
        "Une taille de texte en points, pour un texte de taille normale (le \xAB grand texte \xBB du t\xE9l\xE9phone l'agrandit), et son interligne.",
      type: "object",
      additionalProperties: false,
      required: ["size", "lineHeight"],
      properties: {
        size: { type: "integer", minimum: 10, maximum: 48 },
        lineHeight: { type: "number", minimum: 1, maximum: 2 },
      },
    },
    styleSizes: {
      title: "StyleSizes",
      type: "object",
      additionalProperties: false,
      required: ["title", "heading", "body", "quote", "small"],
      properties: {
        title: { $ref: "#/definitions/styleSize" },
        heading: { $ref: "#/definitions/styleSize" },
        body: { $ref: "#/definitions/styleSize" },
        quote: { $ref: "#/definitions/styleSize" },
        small: { $ref: "#/definitions/styleSize" },
      },
    },
    draft: {
      title: "Draft",
      $comment:
        "Variante \xAB draft \xBB : le brouillon d'un contenu (article, \xE9pisode, m\xE9thode, chapitre, le\xE7on, page).",
      type: "object",
      additionalProperties: false,
      required: ["v", "title", "blocks"],
      properties: {
        v: { const: 1 },
        title: { type: "string", maxLength: 200 },
        cover: { $ref: "#/definitions/mediaRef" },
        audio: { $ref: "#/definitions/mediaRef" },
        blocks: { type: "array", items: { $ref: "#/definitions/topBlock" } },
      },
    },
    template: {
      title: "TemplateDraft",
      $comment:
        "Variante \xAB template \xBB : le brouillon d'un mod\xE8le de blocs (pas de bloc li\xE9).",
      type: "object",
      additionalProperties: false,
      required: ["v", "title", "blocks"],
      properties: {
        v: { const: 1 },
        title: { type: "string", maxLength: 200 },
        cover: { $ref: "#/definitions/mediaRef" },
        audio: { $ref: "#/definitions/mediaRef" },
        blocks: {
          type: "array",
          items: { $ref: "#/definitions/templateBlock" },
        },
      },
    },
    published: {
      title: "PublishedBody",
      $comment:
        "Variante \xAB published \xBB : le corps fig\xE9 d'une version publi\xE9e (\xA7 2.4), ce que lit l'app. Blocs li\xE9s r\xE9solus en copies, fichier obligatoire dans chaque image, texte alternatif r\xE9solu.",
      type: "object",
      additionalProperties: false,
      required: ["v", "title", "blocks"],
      properties: {
        v: { const: 1 },
        title: { type: "string", maxLength: 200 },
        cover: { $ref: "#/definitions/mediaRef" },
        audio: { $ref: "#/definitions/mediaRef" },
        blocks: {
          type: "array",
          items: { $ref: "#/definitions/publishedTopBlock" },
        },
      },
    },
    style: {
      title: "AppStyle",
      $comment:
        "Variante \xAB style \xBB : la charte graphique de l'app (ADMIN \xA7 1, section \xAB App \xBB), un seul document. Rang\xE9e avec les blocs parce qu'elle les habille, dans l'app comme dans l'aper\xE7u de l'admin. Les r\xE9f\xE9rences (une couleur ou une police de la liste) et les noms en double se v\xE9rifient \xE0 part : private.style_problems dans la base, styleProblems dans l'admin.",
      type: "object",
      additionalProperties: false,
      required: [
        "v",
        "darkMode",
        "colors",
        "roles",
        "tints",
        "badges",
        "buttons",
        "fields",
        "fonts",
        "fontRoles",
        "sizes",
        "radius",
        "imageRadius",
        "shadow",
        "underlineLinks",
      ],
      properties: {
        v: { const: 1 },
        darkMode: { enum: ["auto", "light", "dark"] },
        colors: {
          type: "array",
          minItems: 1,
          maxItems: 60,
          items: { $ref: "#/definitions/styleColor" },
        },
        roles: { $ref: "#/definitions/styleColorRoles" },
        tints: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: { $ref: "#/definitions/styleTint" },
        },
        badges: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: { $ref: "#/definitions/styleBadge" },
        },
        buttons: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: { $ref: "#/definitions/styleButton" },
        },
        fields: { enum: ["outline", "filled", "underline"] },
        fonts: {
          type: "array",
          minItems: 3,
          maxItems: 12,
          items: { $ref: "#/definitions/styleFont" },
        },
        fontRoles: { $ref: "#/definitions/styleFontRoles" },
        sizes: { $ref: "#/definitions/styleSizes" },
        radius: { type: "integer", minimum: 0, maximum: 24 },
        imageRadius: { type: "integer", minimum: 0, maximum: 24 },
        shadow: { enum: ["none", "light", "medium", "strong"] },
        underlineLinks: { type: "boolean" },
      },
    },
  },
}
var func19 = Object.prototype.hasOwnProperty
var pattern0 = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
  "u"
)
var pattern27 = new RegExp("^\\S(.*\\S)?$", "u")
var pattern28 = new RegExp("^#[0-9a-f]{6}$", "u")
var func2 = require_ucs2length().default
function validate178(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.name === void 0 && (missing0 = "name")) ||
        (data.light === void 0 && (missing0 = "light")) ||
        (data.dark === void 0 && (missing0 = "dark"))
      ) {
        validate178.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "name" ||
            key0 === "light" ||
            key0 === "dark"
          )) {
            validate178.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate178.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate178.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 40) {
                    validate178.errors = [
                      {
                        instancePath: instancePath + "/name",
                        schemaPath: "#/definitions/styleName/maxLength",
                        keyword: "maxLength",
                        params: { limit: 40 },
                        message: "must NOT have more than 40 characters",
                      },
                    ]
                    return false
                  } else {
                    if (func2(data1) < 1) {
                      validate178.errors = [
                        {
                          instancePath: instancePath + "/name",
                          schemaPath: "#/definitions/styleName/minLength",
                          keyword: "minLength",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 characters",
                        },
                      ]
                      return false
                    } else {
                      if (!pattern27.test(data1)) {
                        validate178.errors = [
                          {
                            instancePath: instancePath + "/name",
                            schemaPath: "#/definitions/styleName/pattern",
                            keyword: "pattern",
                            params: { pattern: "^\\S(.*\\S)?$" },
                            message: 'must match pattern "^\\S(.*\\S)?$"',
                          },
                        ]
                        return false
                      }
                    }
                  }
                } else {
                  validate178.errors = [
                    {
                      instancePath: instancePath + "/name",
                      schemaPath: "#/definitions/styleName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.light !== void 0) {
                let data2 = data.light
                const _errs11 = errors
                const _errs12 = errors
                if (errors === _errs12) {
                  if (typeof data2 === "string") {
                    if (!pattern28.test(data2)) {
                      validate178.errors = [
                        {
                          instancePath: instancePath + "/light",
                          schemaPath: "#/definitions/styleHex/pattern",
                          keyword: "pattern",
                          params: { pattern: "^#[0-9a-f]{6}$" },
                          message: 'must match pattern "^#[0-9a-f]{6}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate178.errors = [
                      {
                        instancePath: instancePath + "/light",
                        schemaPath: "#/definitions/styleHex/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.dark !== void 0) {
                  let data3 = data.dark
                  const _errs15 = errors
                  const _errs16 = errors
                  if (errors === _errs16) {
                    if (typeof data3 === "string") {
                      if (!pattern28.test(data3)) {
                        validate178.errors = [
                          {
                            instancePath: instancePath + "/dark",
                            schemaPath: "#/definitions/styleHex/pattern",
                            keyword: "pattern",
                            params: { pattern: "^#[0-9a-f]{6}$" },
                            message: 'must match pattern "^#[0-9a-f]{6}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate178.errors = [
                        {
                          instancePath: instancePath + "/dark",
                          schemaPath: "#/definitions/styleHex/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs15 === errors
                } else {
                  var valid0 = true
                }
              }
            }
          }
        }
      }
    } else {
      validate178.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate178.errors = vErrors
  return errors === 0
}
var schema117 = {
  title: "StyleColorRoles",
  $comment:
    "O\xF9 va chaque couleur : l'identifiant d'une couleur de la palette pour chaque usage de l'app. Un usage ajout\xE9 plus tard sera facultatif, pour qu'une charte d\xE9j\xE0 enregistr\xE9e reste valable.",
  type: "object",
  additionalProperties: false,
  required: [
    "background",
    "card",
    "border",
    "text",
    "muted",
    "link",
    "primary",
    "topBar",
    "topBarText",
    "tabBar",
    "tabOn",
    "tabOff",
    "focus",
    "success",
    "warning",
    "error",
  ],
  properties: {
    background: { $ref: "#/definitions/uuid" },
    card: { $ref: "#/definitions/uuid" },
    border: { $ref: "#/definitions/uuid" },
    text: { $ref: "#/definitions/uuid" },
    muted: { $ref: "#/definitions/uuid" },
    link: { $ref: "#/definitions/uuid" },
    primary: { $ref: "#/definitions/uuid" },
    topBar: { $ref: "#/definitions/uuid" },
    topBarText: { $ref: "#/definitions/uuid" },
    tabBar: { $ref: "#/definitions/uuid" },
    tabOn: { $ref: "#/definitions/uuid" },
    tabOff: { $ref: "#/definitions/uuid" },
    focus: { $ref: "#/definitions/uuid" },
    success: { $ref: "#/definitions/uuid" },
    warning: { $ref: "#/definitions/uuid" },
    error: { $ref: "#/definitions/uuid" },
  },
}
function validate180(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.background === void 0 && (missing0 = "background")) ||
        (data.card === void 0 && (missing0 = "card")) ||
        (data.border === void 0 && (missing0 = "border")) ||
        (data.text === void 0 && (missing0 = "text")) ||
        (data.muted === void 0 && (missing0 = "muted")) ||
        (data.link === void 0 && (missing0 = "link")) ||
        (data.primary === void 0 && (missing0 = "primary")) ||
        (data.topBar === void 0 && (missing0 = "topBar")) ||
        (data.topBarText === void 0 && (missing0 = "topBarText")) ||
        (data.tabBar === void 0 && (missing0 = "tabBar")) ||
        (data.tabOn === void 0 && (missing0 = "tabOn")) ||
        (data.tabOff === void 0 && (missing0 = "tabOff")) ||
        (data.focus === void 0 && (missing0 = "focus")) ||
        (data.success === void 0 && (missing0 = "success")) ||
        (data.warning === void 0 && (missing0 = "warning")) ||
        (data.error === void 0 && (missing0 = "error"))
      ) {
        validate180.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!func19.call(schema117.properties, key0)) {
            validate180.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.background !== void 0) {
            let data0 = data.background
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate180.errors = [
                    {
                      instancePath: instancePath + "/background",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate180.errors = [
                  {
                    instancePath: instancePath + "/background",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.card !== void 0) {
              let data1 = data.card
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (!pattern0.test(data1)) {
                    validate180.errors = [
                      {
                        instancePath: instancePath + "/card",
                        schemaPath: "#/definitions/uuid/pattern",
                        keyword: "pattern",
                        params: {
                          pattern:
                            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                        },
                        message:
                          'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                      },
                    ]
                    return false
                  }
                } else {
                  validate180.errors = [
                    {
                      instancePath: instancePath + "/card",
                      schemaPath: "#/definitions/uuid/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.border !== void 0) {
                let data2 = data.border
                const _errs11 = errors
                const _errs12 = errors
                if (errors === _errs12) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate180.errors = [
                        {
                          instancePath: instancePath + "/border",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate180.errors = [
                      {
                        instancePath: instancePath + "/border",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.text !== void 0) {
                  let data3 = data.text
                  const _errs15 = errors
                  const _errs16 = errors
                  if (errors === _errs16) {
                    if (typeof data3 === "string") {
                      if (!pattern0.test(data3)) {
                        validate180.errors = [
                          {
                            instancePath: instancePath + "/text",
                            schemaPath: "#/definitions/uuid/pattern",
                            keyword: "pattern",
                            params: {
                              pattern:
                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                            },
                            message:
                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate180.errors = [
                        {
                          instancePath: instancePath + "/text",
                          schemaPath: "#/definitions/uuid/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs15 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.muted !== void 0) {
                    let data4 = data.muted
                    const _errs19 = errors
                    const _errs20 = errors
                    if (errors === _errs20) {
                      if (typeof data4 === "string") {
                        if (!pattern0.test(data4)) {
                          validate180.errors = [
                            {
                              instancePath: instancePath + "/muted",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate180.errors = [
                          {
                            instancePath: instancePath + "/muted",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs19 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.link !== void 0) {
                      let data5 = data.link
                      const _errs23 = errors
                      const _errs24 = errors
                      if (errors === _errs24) {
                        if (typeof data5 === "string") {
                          if (!pattern0.test(data5)) {
                            validate180.errors = [
                              {
                                instancePath: instancePath + "/link",
                                schemaPath: "#/definitions/uuid/pattern",
                                keyword: "pattern",
                                params: {
                                  pattern:
                                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                },
                                message:
                                  'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                              },
                            ]
                            return false
                          }
                        } else {
                          validate180.errors = [
                            {
                              instancePath: instancePath + "/link",
                              schemaPath: "#/definitions/uuid/type",
                              keyword: "type",
                              params: { type: "string" },
                              message: "must be string",
                            },
                          ]
                          return false
                        }
                      }
                      var valid0 = _errs23 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.primary !== void 0) {
                        let data6 = data.primary
                        const _errs27 = errors
                        const _errs28 = errors
                        if (errors === _errs28) {
                          if (typeof data6 === "string") {
                            if (!pattern0.test(data6)) {
                              validate180.errors = [
                                {
                                  instancePath: instancePath + "/primary",
                                  schemaPath: "#/definitions/uuid/pattern",
                                  keyword: "pattern",
                                  params: {
                                    pattern:
                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                  },
                                  message:
                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                },
                              ]
                              return false
                            }
                          } else {
                            validate180.errors = [
                              {
                                instancePath: instancePath + "/primary",
                                schemaPath: "#/definitions/uuid/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs27 === errors
                      } else {
                        var valid0 = true
                      }
                      if (valid0) {
                        if (data.topBar !== void 0) {
                          let data7 = data.topBar
                          const _errs31 = errors
                          const _errs32 = errors
                          if (errors === _errs32) {
                            if (typeof data7 === "string") {
                              if (!pattern0.test(data7)) {
                                validate180.errors = [
                                  {
                                    instancePath: instancePath + "/topBar",
                                    schemaPath: "#/definitions/uuid/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern:
                                        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                    },
                                    message:
                                      'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                  },
                                ]
                                return false
                              }
                            } else {
                              validate180.errors = [
                                {
                                  instancePath: instancePath + "/topBar",
                                  schemaPath: "#/definitions/uuid/type",
                                  keyword: "type",
                                  params: { type: "string" },
                                  message: "must be string",
                                },
                              ]
                              return false
                            }
                          }
                          var valid0 = _errs31 === errors
                        } else {
                          var valid0 = true
                        }
                        if (valid0) {
                          if (data.topBarText !== void 0) {
                            let data8 = data.topBarText
                            const _errs35 = errors
                            const _errs36 = errors
                            if (errors === _errs36) {
                              if (typeof data8 === "string") {
                                if (!pattern0.test(data8)) {
                                  validate180.errors = [
                                    {
                                      instancePath:
                                        instancePath + "/topBarText",
                                      schemaPath: "#/definitions/uuid/pattern",
                                      keyword: "pattern",
                                      params: {
                                        pattern:
                                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                      },
                                      message:
                                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                    },
                                  ]
                                  return false
                                }
                              } else {
                                validate180.errors = [
                                  {
                                    instancePath: instancePath + "/topBarText",
                                    schemaPath: "#/definitions/uuid/type",
                                    keyword: "type",
                                    params: { type: "string" },
                                    message: "must be string",
                                  },
                                ]
                                return false
                              }
                            }
                            var valid0 = _errs35 === errors
                          } else {
                            var valid0 = true
                          }
                          if (valid0) {
                            if (data.tabBar !== void 0) {
                              let data9 = data.tabBar
                              const _errs39 = errors
                              const _errs40 = errors
                              if (errors === _errs40) {
                                if (typeof data9 === "string") {
                                  if (!pattern0.test(data9)) {
                                    validate180.errors = [
                                      {
                                        instancePath: instancePath + "/tabBar",
                                        schemaPath:
                                          "#/definitions/uuid/pattern",
                                        keyword: "pattern",
                                        params: {
                                          pattern:
                                            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                        },
                                        message:
                                          'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                      },
                                    ]
                                    return false
                                  }
                                } else {
                                  validate180.errors = [
                                    {
                                      instancePath: instancePath + "/tabBar",
                                      schemaPath: "#/definitions/uuid/type",
                                      keyword: "type",
                                      params: { type: "string" },
                                      message: "must be string",
                                    },
                                  ]
                                  return false
                                }
                              }
                              var valid0 = _errs39 === errors
                            } else {
                              var valid0 = true
                            }
                            if (valid0) {
                              if (data.tabOn !== void 0) {
                                let data10 = data.tabOn
                                const _errs43 = errors
                                const _errs44 = errors
                                if (errors === _errs44) {
                                  if (typeof data10 === "string") {
                                    if (!pattern0.test(data10)) {
                                      validate180.errors = [
                                        {
                                          instancePath: instancePath + "/tabOn",
                                          schemaPath:
                                            "#/definitions/uuid/pattern",
                                          keyword: "pattern",
                                          params: {
                                            pattern:
                                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                          },
                                          message:
                                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                        },
                                      ]
                                      return false
                                    }
                                  } else {
                                    validate180.errors = [
                                      {
                                        instancePath: instancePath + "/tabOn",
                                        schemaPath: "#/definitions/uuid/type",
                                        keyword: "type",
                                        params: { type: "string" },
                                        message: "must be string",
                                      },
                                    ]
                                    return false
                                  }
                                }
                                var valid0 = _errs43 === errors
                              } else {
                                var valid0 = true
                              }
                              if (valid0) {
                                if (data.tabOff !== void 0) {
                                  let data11 = data.tabOff
                                  const _errs47 = errors
                                  const _errs48 = errors
                                  if (errors === _errs48) {
                                    if (typeof data11 === "string") {
                                      if (!pattern0.test(data11)) {
                                        validate180.errors = [
                                          {
                                            instancePath:
                                              instancePath + "/tabOff",
                                            schemaPath:
                                              "#/definitions/uuid/pattern",
                                            keyword: "pattern",
                                            params: {
                                              pattern:
                                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                            },
                                            message:
                                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                          },
                                        ]
                                        return false
                                      }
                                    } else {
                                      validate180.errors = [
                                        {
                                          instancePath:
                                            instancePath + "/tabOff",
                                          schemaPath: "#/definitions/uuid/type",
                                          keyword: "type",
                                          params: { type: "string" },
                                          message: "must be string",
                                        },
                                      ]
                                      return false
                                    }
                                  }
                                  var valid0 = _errs47 === errors
                                } else {
                                  var valid0 = true
                                }
                                if (valid0) {
                                  if (data.focus !== void 0) {
                                    let data12 = data.focus
                                    const _errs51 = errors
                                    const _errs52 = errors
                                    if (errors === _errs52) {
                                      if (typeof data12 === "string") {
                                        if (!pattern0.test(data12)) {
                                          validate180.errors = [
                                            {
                                              instancePath:
                                                instancePath + "/focus",
                                              schemaPath:
                                                "#/definitions/uuid/pattern",
                                              keyword: "pattern",
                                              params: {
                                                pattern:
                                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                              },
                                              message:
                                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                            },
                                          ]
                                          return false
                                        }
                                      } else {
                                        validate180.errors = [
                                          {
                                            instancePath:
                                              instancePath + "/focus",
                                            schemaPath:
                                              "#/definitions/uuid/type",
                                            keyword: "type",
                                            params: { type: "string" },
                                            message: "must be string",
                                          },
                                        ]
                                        return false
                                      }
                                    }
                                    var valid0 = _errs51 === errors
                                  } else {
                                    var valid0 = true
                                  }
                                  if (valid0) {
                                    if (data.success !== void 0) {
                                      let data13 = data.success
                                      const _errs55 = errors
                                      const _errs56 = errors
                                      if (errors === _errs56) {
                                        if (typeof data13 === "string") {
                                          if (!pattern0.test(data13)) {
                                            validate180.errors = [
                                              {
                                                instancePath:
                                                  instancePath + "/success",
                                                schemaPath:
                                                  "#/definitions/uuid/pattern",
                                                keyword: "pattern",
                                                params: {
                                                  pattern:
                                                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                                },
                                                message:
                                                  'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                              },
                                            ]
                                            return false
                                          }
                                        } else {
                                          validate180.errors = [
                                            {
                                              instancePath:
                                                instancePath + "/success",
                                              schemaPath:
                                                "#/definitions/uuid/type",
                                              keyword: "type",
                                              params: { type: "string" },
                                              message: "must be string",
                                            },
                                          ]
                                          return false
                                        }
                                      }
                                      var valid0 = _errs55 === errors
                                    } else {
                                      var valid0 = true
                                    }
                                    if (valid0) {
                                      if (data.warning !== void 0) {
                                        let data14 = data.warning
                                        const _errs59 = errors
                                        const _errs60 = errors
                                        if (errors === _errs60) {
                                          if (typeof data14 === "string") {
                                            if (!pattern0.test(data14)) {
                                              validate180.errors = [
                                                {
                                                  instancePath:
                                                    instancePath + "/warning",
                                                  schemaPath:
                                                    "#/definitions/uuid/pattern",
                                                  keyword: "pattern",
                                                  params: {
                                                    pattern:
                                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                                  },
                                                  message:
                                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                                },
                                              ]
                                              return false
                                            }
                                          } else {
                                            validate180.errors = [
                                              {
                                                instancePath:
                                                  instancePath + "/warning",
                                                schemaPath:
                                                  "#/definitions/uuid/type",
                                                keyword: "type",
                                                params: { type: "string" },
                                                message: "must be string",
                                              },
                                            ]
                                            return false
                                          }
                                        }
                                        var valid0 = _errs59 === errors
                                      } else {
                                        var valid0 = true
                                      }
                                      if (valid0) {
                                        if (data.error !== void 0) {
                                          let data15 = data.error
                                          const _errs63 = errors
                                          const _errs64 = errors
                                          if (errors === _errs64) {
                                            if (typeof data15 === "string") {
                                              if (!pattern0.test(data15)) {
                                                validate180.errors = [
                                                  {
                                                    instancePath:
                                                      instancePath + "/error",
                                                    schemaPath:
                                                      "#/definitions/uuid/pattern",
                                                    keyword: "pattern",
                                                    params: {
                                                      pattern:
                                                        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                                    },
                                                    message:
                                                      'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                                  },
                                                ]
                                                return false
                                              }
                                            } else {
                                              validate180.errors = [
                                                {
                                                  instancePath:
                                                    instancePath + "/error",
                                                  schemaPath:
                                                    "#/definitions/uuid/type",
                                                  keyword: "type",
                                                  params: { type: "string" },
                                                  message: "must be string",
                                                },
                                              ]
                                              return false
                                            }
                                          }
                                          var valid0 = _errs63 === errors
                                        } else {
                                          var valid0 = true
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate180.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate180.errors = vErrors
  return errors === 0
}
function validate182(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.name === void 0 && (missing0 = "name")) ||
        (data.fill === void 0 && (missing0 = "fill")) ||
        (data.border === void 0 && (missing0 = "border")) ||
        (data.title === void 0 && (missing0 = "title")) ||
        (data.text === void 0 && (missing0 = "text")) ||
        (data.link === void 0 && (missing0 = "link"))
      ) {
        validate182.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "name" ||
            key0 === "fill" ||
            key0 === "border" ||
            key0 === "title" ||
            key0 === "text" ||
            key0 === "link"
          )) {
            validate182.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate182.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate182.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 40) {
                    validate182.errors = [
                      {
                        instancePath: instancePath + "/name",
                        schemaPath: "#/definitions/styleName/maxLength",
                        keyword: "maxLength",
                        params: { limit: 40 },
                        message: "must NOT have more than 40 characters",
                      },
                    ]
                    return false
                  } else {
                    if (func2(data1) < 1) {
                      validate182.errors = [
                        {
                          instancePath: instancePath + "/name",
                          schemaPath: "#/definitions/styleName/minLength",
                          keyword: "minLength",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 characters",
                        },
                      ]
                      return false
                    } else {
                      if (!pattern27.test(data1)) {
                        validate182.errors = [
                          {
                            instancePath: instancePath + "/name",
                            schemaPath: "#/definitions/styleName/pattern",
                            keyword: "pattern",
                            params: { pattern: "^\\S(.*\\S)?$" },
                            message: 'must match pattern "^\\S(.*\\S)?$"',
                          },
                        ]
                        return false
                      }
                    }
                  }
                } else {
                  validate182.errors = [
                    {
                      instancePath: instancePath + "/name",
                      schemaPath: "#/definitions/styleName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.fill !== void 0) {
                let data2 = data.fill
                const _errs11 = errors
                const _errs12 = errors
                if (errors === _errs12) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate182.errors = [
                        {
                          instancePath: instancePath + "/fill",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate182.errors = [
                      {
                        instancePath: instancePath + "/fill",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.border !== void 0) {
                  let data3 = data.border
                  const _errs15 = errors
                  const _errs16 = errors
                  if (errors === _errs16) {
                    if (typeof data3 === "string") {
                      if (!pattern0.test(data3)) {
                        validate182.errors = [
                          {
                            instancePath: instancePath + "/border",
                            schemaPath: "#/definitions/uuid/pattern",
                            keyword: "pattern",
                            params: {
                              pattern:
                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                            },
                            message:
                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate182.errors = [
                        {
                          instancePath: instancePath + "/border",
                          schemaPath: "#/definitions/uuid/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs15 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.title !== void 0) {
                    let data4 = data.title
                    const _errs19 = errors
                    const _errs20 = errors
                    if (errors === _errs20) {
                      if (typeof data4 === "string") {
                        if (!pattern0.test(data4)) {
                          validate182.errors = [
                            {
                              instancePath: instancePath + "/title",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate182.errors = [
                          {
                            instancePath: instancePath + "/title",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs19 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.text !== void 0) {
                      let data5 = data.text
                      const _errs23 = errors
                      const _errs24 = errors
                      if (errors === _errs24) {
                        if (typeof data5 === "string") {
                          if (!pattern0.test(data5)) {
                            validate182.errors = [
                              {
                                instancePath: instancePath + "/text",
                                schemaPath: "#/definitions/uuid/pattern",
                                keyword: "pattern",
                                params: {
                                  pattern:
                                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                },
                                message:
                                  'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                              },
                            ]
                            return false
                          }
                        } else {
                          validate182.errors = [
                            {
                              instancePath: instancePath + "/text",
                              schemaPath: "#/definitions/uuid/type",
                              keyword: "type",
                              params: { type: "string" },
                              message: "must be string",
                            },
                          ]
                          return false
                        }
                      }
                      var valid0 = _errs23 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.link !== void 0) {
                        let data6 = data.link
                        const _errs27 = errors
                        const _errs28 = errors
                        if (errors === _errs28) {
                          if (typeof data6 === "string") {
                            if (!pattern0.test(data6)) {
                              validate182.errors = [
                                {
                                  instancePath: instancePath + "/link",
                                  schemaPath: "#/definitions/uuid/pattern",
                                  keyword: "pattern",
                                  params: {
                                    pattern:
                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                  },
                                  message:
                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                },
                              ]
                              return false
                            }
                          } else {
                            validate182.errors = [
                              {
                                instancePath: instancePath + "/link",
                                schemaPath: "#/definitions/uuid/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs27 === errors
                      } else {
                        var valid0 = true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate182.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate182.errors = vErrors
  return errors === 0
}
function validate184(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.name === void 0 && (missing0 = "name")) ||
        (data.fill === void 0 && (missing0 = "fill")) ||
        (data.border === void 0 && (missing0 = "border")) ||
        (data.text === void 0 && (missing0 = "text"))
      ) {
        validate184.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "name" ||
            key0 === "fill" ||
            key0 === "border" ||
            key0 === "text"
          )) {
            validate184.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate184.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate184.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 40) {
                    validate184.errors = [
                      {
                        instancePath: instancePath + "/name",
                        schemaPath: "#/definitions/styleName/maxLength",
                        keyword: "maxLength",
                        params: { limit: 40 },
                        message: "must NOT have more than 40 characters",
                      },
                    ]
                    return false
                  } else {
                    if (func2(data1) < 1) {
                      validate184.errors = [
                        {
                          instancePath: instancePath + "/name",
                          schemaPath: "#/definitions/styleName/minLength",
                          keyword: "minLength",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 characters",
                        },
                      ]
                      return false
                    } else {
                      if (!pattern27.test(data1)) {
                        validate184.errors = [
                          {
                            instancePath: instancePath + "/name",
                            schemaPath: "#/definitions/styleName/pattern",
                            keyword: "pattern",
                            params: { pattern: "^\\S(.*\\S)?$" },
                            message: 'must match pattern "^\\S(.*\\S)?$"',
                          },
                        ]
                        return false
                      }
                    }
                  }
                } else {
                  validate184.errors = [
                    {
                      instancePath: instancePath + "/name",
                      schemaPath: "#/definitions/styleName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.fill !== void 0) {
                let data2 = data.fill
                const _errs11 = errors
                const _errs12 = errors
                if (errors === _errs12) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate184.errors = [
                        {
                          instancePath: instancePath + "/fill",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate184.errors = [
                      {
                        instancePath: instancePath + "/fill",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.border !== void 0) {
                  let data3 = data.border
                  const _errs15 = errors
                  const _errs16 = errors
                  if (errors === _errs16) {
                    if (typeof data3 === "string") {
                      if (!pattern0.test(data3)) {
                        validate184.errors = [
                          {
                            instancePath: instancePath + "/border",
                            schemaPath: "#/definitions/uuid/pattern",
                            keyword: "pattern",
                            params: {
                              pattern:
                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                            },
                            message:
                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate184.errors = [
                        {
                          instancePath: instancePath + "/border",
                          schemaPath: "#/definitions/uuid/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs15 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.text !== void 0) {
                    let data4 = data.text
                    const _errs19 = errors
                    const _errs20 = errors
                    if (errors === _errs20) {
                      if (typeof data4 === "string") {
                        if (!pattern0.test(data4)) {
                          validate184.errors = [
                            {
                              instancePath: instancePath + "/text",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate184.errors = [
                          {
                            instancePath: instancePath + "/text",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs19 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate184.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate184.errors = vErrors
  return errors === 0
}
var schema148 = {
  title: "StyleButton",
  $comment:
    "Un bouton : aplat (fill), d\xE9grad\xE9 (de fill \xE0 end), bordure (border) ou texte seul ; label est la couleur du texte. Toutes les couleurs restent, m\xEAme celles que le style n'emploie pas : changer de style ne perd rien. rounded : l'arrondi de la charte. Le premier sert aux boutons de l'app.",
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "kind", "shape", "fill", "end", "border", "label"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    name: { $ref: "#/definitions/styleName" },
    kind: { enum: ["flat", "gradient", "outline", "text"] },
    shape: { enum: ["rounded", "pill", "square"] },
    fill: { $ref: "#/definitions/uuid" },
    end: { $ref: "#/definitions/uuid" },
    border: { $ref: "#/definitions/uuid" },
    label: { $ref: "#/definitions/uuid" },
  },
}
function validate186(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.name === void 0 && (missing0 = "name")) ||
        (data.kind === void 0 && (missing0 = "kind")) ||
        (data.shape === void 0 && (missing0 = "shape")) ||
        (data.fill === void 0 && (missing0 = "fill")) ||
        (data.end === void 0 && (missing0 = "end")) ||
        (data.border === void 0 && (missing0 = "border")) ||
        (data.label === void 0 && (missing0 = "label"))
      ) {
        validate186.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "name" ||
            key0 === "kind" ||
            key0 === "shape" ||
            key0 === "fill" ||
            key0 === "end" ||
            key0 === "border" ||
            key0 === "label"
          )) {
            validate186.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate186.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate186.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 40) {
                    validate186.errors = [
                      {
                        instancePath: instancePath + "/name",
                        schemaPath: "#/definitions/styleName/maxLength",
                        keyword: "maxLength",
                        params: { limit: 40 },
                        message: "must NOT have more than 40 characters",
                      },
                    ]
                    return false
                  } else {
                    if (func2(data1) < 1) {
                      validate186.errors = [
                        {
                          instancePath: instancePath + "/name",
                          schemaPath: "#/definitions/styleName/minLength",
                          keyword: "minLength",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 characters",
                        },
                      ]
                      return false
                    } else {
                      if (!pattern27.test(data1)) {
                        validate186.errors = [
                          {
                            instancePath: instancePath + "/name",
                            schemaPath: "#/definitions/styleName/pattern",
                            keyword: "pattern",
                            params: { pattern: "^\\S(.*\\S)?$" },
                            message: 'must match pattern "^\\S(.*\\S)?$"',
                          },
                        ]
                        return false
                      }
                    }
                  }
                } else {
                  validate186.errors = [
                    {
                      instancePath: instancePath + "/name",
                      schemaPath: "#/definitions/styleName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.kind !== void 0) {
                let data2 = data.kind
                const _errs11 = errors
                if (!(
                  data2 === "flat" ||
                  data2 === "gradient" ||
                  data2 === "outline" ||
                  data2 === "text"
                )) {
                  validate186.errors = [
                    {
                      instancePath: instancePath + "/kind",
                      schemaPath: "#/properties/kind/enum",
                      keyword: "enum",
                      params: { allowedValues: schema148.properties.kind.enum },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.shape !== void 0) {
                  let data3 = data.shape
                  const _errs12 = errors
                  if (!(
                    data3 === "rounded" ||
                    data3 === "pill" ||
                    data3 === "square"
                  )) {
                    validate186.errors = [
                      {
                        instancePath: instancePath + "/shape",
                        schemaPath: "#/properties/shape/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: schema148.properties.shape.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                  var valid0 = _errs12 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.fill !== void 0) {
                    let data4 = data.fill
                    const _errs13 = errors
                    const _errs14 = errors
                    if (errors === _errs14) {
                      if (typeof data4 === "string") {
                        if (!pattern0.test(data4)) {
                          validate186.errors = [
                            {
                              instancePath: instancePath + "/fill",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate186.errors = [
                          {
                            instancePath: instancePath + "/fill",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs13 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.end !== void 0) {
                      let data5 = data.end
                      const _errs17 = errors
                      const _errs18 = errors
                      if (errors === _errs18) {
                        if (typeof data5 === "string") {
                          if (!pattern0.test(data5)) {
                            validate186.errors = [
                              {
                                instancePath: instancePath + "/end",
                                schemaPath: "#/definitions/uuid/pattern",
                                keyword: "pattern",
                                params: {
                                  pattern:
                                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                },
                                message:
                                  'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                              },
                            ]
                            return false
                          }
                        } else {
                          validate186.errors = [
                            {
                              instancePath: instancePath + "/end",
                              schemaPath: "#/definitions/uuid/type",
                              keyword: "type",
                              params: { type: "string" },
                              message: "must be string",
                            },
                          ]
                          return false
                        }
                      }
                      var valid0 = _errs17 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.border !== void 0) {
                        let data6 = data.border
                        const _errs21 = errors
                        const _errs22 = errors
                        if (errors === _errs22) {
                          if (typeof data6 === "string") {
                            if (!pattern0.test(data6)) {
                              validate186.errors = [
                                {
                                  instancePath: instancePath + "/border",
                                  schemaPath: "#/definitions/uuid/pattern",
                                  keyword: "pattern",
                                  params: {
                                    pattern:
                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                  },
                                  message:
                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                },
                              ]
                              return false
                            }
                          } else {
                            validate186.errors = [
                              {
                                instancePath: instancePath + "/border",
                                schemaPath: "#/definitions/uuid/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs21 === errors
                      } else {
                        var valid0 = true
                      }
                      if (valid0) {
                        if (data.label !== void 0) {
                          let data7 = data.label
                          const _errs25 = errors
                          const _errs26 = errors
                          if (errors === _errs26) {
                            if (typeof data7 === "string") {
                              if (!pattern0.test(data7)) {
                                validate186.errors = [
                                  {
                                    instancePath: instancePath + "/label",
                                    schemaPath: "#/definitions/uuid/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern:
                                        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                    },
                                    message:
                                      'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                  },
                                ]
                                return false
                              }
                            } else {
                              validate186.errors = [
                                {
                                  instancePath: instancePath + "/label",
                                  schemaPath: "#/definitions/uuid/type",
                                  keyword: "type",
                                  params: { type: "string" },
                                  message: "must be string",
                                },
                              ]
                              return false
                            }
                          }
                          var valid0 = _errs25 === errors
                        } else {
                          var valid0 = true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate186.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate186.errors = vErrors
  return errors === 0
}
var schema155 = {
  title: "StyleFont",
  $comment:
    "Une police : system (celle du t\xE9l\xE9phone) ou une police libre de Google Fonts, copi\xE9e dans le stockage de l'installation. On ne fait qu'ajouter des familles ; les \xE9paisseurs de chacune sont dans l'admin.",
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "family", "weight"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    name: { $ref: "#/definitions/styleName" },
    family: {
      enum: [
        "system",
        "DM Sans",
        "DM Serif Display",
        "Fraunces",
        "Inter",
        "Libre Baskerville",
        "Lora",
        "Merriweather",
        "Nunito",
        "Playfair Display",
        "Poppins",
        "Source Serif 4",
        "Space Grotesk",
        "Work Sans",
      ],
    },
    weight: { enum: [400, 500, 600, 700] },
  },
}
function validate188(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.name === void 0 && (missing0 = "name")) ||
        (data.family === void 0 && (missing0 = "family")) ||
        (data.weight === void 0 && (missing0 = "weight"))
      ) {
        validate188.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "name" ||
            key0 === "family" ||
            key0 === "weight"
          )) {
            validate188.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate188.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate188.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 40) {
                    validate188.errors = [
                      {
                        instancePath: instancePath + "/name",
                        schemaPath: "#/definitions/styleName/maxLength",
                        keyword: "maxLength",
                        params: { limit: 40 },
                        message: "must NOT have more than 40 characters",
                      },
                    ]
                    return false
                  } else {
                    if (func2(data1) < 1) {
                      validate188.errors = [
                        {
                          instancePath: instancePath + "/name",
                          schemaPath: "#/definitions/styleName/minLength",
                          keyword: "minLength",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 characters",
                        },
                      ]
                      return false
                    } else {
                      if (!pattern27.test(data1)) {
                        validate188.errors = [
                          {
                            instancePath: instancePath + "/name",
                            schemaPath: "#/definitions/styleName/pattern",
                            keyword: "pattern",
                            params: { pattern: "^\\S(.*\\S)?$" },
                            message: 'must match pattern "^\\S(.*\\S)?$"',
                          },
                        ]
                        return false
                      }
                    }
                  }
                } else {
                  validate188.errors = [
                    {
                      instancePath: instancePath + "/name",
                      schemaPath: "#/definitions/styleName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.family !== void 0) {
                let data2 = data.family
                const _errs11 = errors
                if (!(
                  data2 === "system" ||
                  data2 === "DM Sans" ||
                  data2 === "DM Serif Display" ||
                  data2 === "Fraunces" ||
                  data2 === "Inter" ||
                  data2 === "Libre Baskerville" ||
                  data2 === "Lora" ||
                  data2 === "Merriweather" ||
                  data2 === "Nunito" ||
                  data2 === "Playfair Display" ||
                  data2 === "Poppins" ||
                  data2 === "Source Serif 4" ||
                  data2 === "Space Grotesk" ||
                  data2 === "Work Sans"
                )) {
                  validate188.errors = [
                    {
                      instancePath: instancePath + "/family",
                      schemaPath: "#/properties/family/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: schema155.properties.family.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.weight !== void 0) {
                  let data3 = data.weight
                  const _errs12 = errors
                  if (!(
                    data3 === 400 ||
                    data3 === 500 ||
                    data3 === 600 ||
                    data3 === 700
                  )) {
                    validate188.errors = [
                      {
                        instancePath: instancePath + "/weight",
                        schemaPath: "#/properties/weight/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: schema155.properties.weight.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                  var valid0 = _errs12 === errors
                } else {
                  var valid0 = true
                }
              }
            }
          }
        }
      }
    } else {
      validate188.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate188.errors = vErrors
  return errors === 0
}
var schema158 = {
  title: "StyleFontRoles",
  $comment:
    "O\xF9 va chaque police : l'identifiant d'une police de la liste pour chaque usage.",
  type: "object",
  additionalProperties: false,
  required: [
    "brand",
    "title",
    "heading",
    "body",
    "quote",
    "small",
    "boxTitle",
    "button",
    "tabs",
  ],
  properties: {
    brand: { $ref: "#/definitions/uuid" },
    title: { $ref: "#/definitions/uuid" },
    heading: { $ref: "#/definitions/uuid" },
    body: { $ref: "#/definitions/uuid" },
    quote: { $ref: "#/definitions/uuid" },
    small: { $ref: "#/definitions/uuid" },
    boxTitle: { $ref: "#/definitions/uuid" },
    button: { $ref: "#/definitions/uuid" },
    tabs: { $ref: "#/definitions/uuid" },
  },
}
function validate190(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.brand === void 0 && (missing0 = "brand")) ||
        (data.title === void 0 && (missing0 = "title")) ||
        (data.heading === void 0 && (missing0 = "heading")) ||
        (data.body === void 0 && (missing0 = "body")) ||
        (data.quote === void 0 && (missing0 = "quote")) ||
        (data.small === void 0 && (missing0 = "small")) ||
        (data.boxTitle === void 0 && (missing0 = "boxTitle")) ||
        (data.button === void 0 && (missing0 = "button")) ||
        (data.tabs === void 0 && (missing0 = "tabs"))
      ) {
        validate190.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!func19.call(schema158.properties, key0)) {
            validate190.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.brand !== void 0) {
            let data0 = data.brand
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate190.errors = [
                    {
                      instancePath: instancePath + "/brand",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate190.errors = [
                  {
                    instancePath: instancePath + "/brand",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.title !== void 0) {
              let data1 = data.title
              const _errs7 = errors
              const _errs8 = errors
              if (errors === _errs8) {
                if (typeof data1 === "string") {
                  if (!pattern0.test(data1)) {
                    validate190.errors = [
                      {
                        instancePath: instancePath + "/title",
                        schemaPath: "#/definitions/uuid/pattern",
                        keyword: "pattern",
                        params: {
                          pattern:
                            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                        },
                        message:
                          'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                      },
                    ]
                    return false
                  }
                } else {
                  validate190.errors = [
                    {
                      instancePath: instancePath + "/title",
                      schemaPath: "#/definitions/uuid/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.heading !== void 0) {
                let data2 = data.heading
                const _errs11 = errors
                const _errs12 = errors
                if (errors === _errs12) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate190.errors = [
                        {
                          instancePath: instancePath + "/heading",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate190.errors = [
                      {
                        instancePath: instancePath + "/heading",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs11 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.body !== void 0) {
                  let data3 = data.body
                  const _errs15 = errors
                  const _errs16 = errors
                  if (errors === _errs16) {
                    if (typeof data3 === "string") {
                      if (!pattern0.test(data3)) {
                        validate190.errors = [
                          {
                            instancePath: instancePath + "/body",
                            schemaPath: "#/definitions/uuid/pattern",
                            keyword: "pattern",
                            params: {
                              pattern:
                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                            },
                            message:
                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate190.errors = [
                        {
                          instancePath: instancePath + "/body",
                          schemaPath: "#/definitions/uuid/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs15 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.quote !== void 0) {
                    let data4 = data.quote
                    const _errs19 = errors
                    const _errs20 = errors
                    if (errors === _errs20) {
                      if (typeof data4 === "string") {
                        if (!pattern0.test(data4)) {
                          validate190.errors = [
                            {
                              instancePath: instancePath + "/quote",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate190.errors = [
                          {
                            instancePath: instancePath + "/quote",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs19 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.small !== void 0) {
                      let data5 = data.small
                      const _errs23 = errors
                      const _errs24 = errors
                      if (errors === _errs24) {
                        if (typeof data5 === "string") {
                          if (!pattern0.test(data5)) {
                            validate190.errors = [
                              {
                                instancePath: instancePath + "/small",
                                schemaPath: "#/definitions/uuid/pattern",
                                keyword: "pattern",
                                params: {
                                  pattern:
                                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                },
                                message:
                                  'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                              },
                            ]
                            return false
                          }
                        } else {
                          validate190.errors = [
                            {
                              instancePath: instancePath + "/small",
                              schemaPath: "#/definitions/uuid/type",
                              keyword: "type",
                              params: { type: "string" },
                              message: "must be string",
                            },
                          ]
                          return false
                        }
                      }
                      var valid0 = _errs23 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.boxTitle !== void 0) {
                        let data6 = data.boxTitle
                        const _errs27 = errors
                        const _errs28 = errors
                        if (errors === _errs28) {
                          if (typeof data6 === "string") {
                            if (!pattern0.test(data6)) {
                              validate190.errors = [
                                {
                                  instancePath: instancePath + "/boxTitle",
                                  schemaPath: "#/definitions/uuid/pattern",
                                  keyword: "pattern",
                                  params: {
                                    pattern:
                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                  },
                                  message:
                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                },
                              ]
                              return false
                            }
                          } else {
                            validate190.errors = [
                              {
                                instancePath: instancePath + "/boxTitle",
                                schemaPath: "#/definitions/uuid/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs27 === errors
                      } else {
                        var valid0 = true
                      }
                      if (valid0) {
                        if (data.button !== void 0) {
                          let data7 = data.button
                          const _errs31 = errors
                          const _errs32 = errors
                          if (errors === _errs32) {
                            if (typeof data7 === "string") {
                              if (!pattern0.test(data7)) {
                                validate190.errors = [
                                  {
                                    instancePath: instancePath + "/button",
                                    schemaPath: "#/definitions/uuid/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern:
                                        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                    },
                                    message:
                                      'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                  },
                                ]
                                return false
                              }
                            } else {
                              validate190.errors = [
                                {
                                  instancePath: instancePath + "/button",
                                  schemaPath: "#/definitions/uuid/type",
                                  keyword: "type",
                                  params: { type: "string" },
                                  message: "must be string",
                                },
                              ]
                              return false
                            }
                          }
                          var valid0 = _errs31 === errors
                        } else {
                          var valid0 = true
                        }
                        if (valid0) {
                          if (data.tabs !== void 0) {
                            let data8 = data.tabs
                            const _errs35 = errors
                            const _errs36 = errors
                            if (errors === _errs36) {
                              if (typeof data8 === "string") {
                                if (!pattern0.test(data8)) {
                                  validate190.errors = [
                                    {
                                      instancePath: instancePath + "/tabs",
                                      schemaPath: "#/definitions/uuid/pattern",
                                      keyword: "pattern",
                                      params: {
                                        pattern:
                                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                      },
                                      message:
                                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                    },
                                  ]
                                  return false
                                }
                              } else {
                                validate190.errors = [
                                  {
                                    instancePath: instancePath + "/tabs",
                                    schemaPath: "#/definitions/uuid/type",
                                    keyword: "type",
                                    params: { type: "string" },
                                    message: "must be string",
                                  },
                                ]
                                return false
                              }
                            }
                            var valid0 = _errs35 === errors
                          } else {
                            var valid0 = true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate190.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate190.errors = vErrors
  return errors === 0
}
function validate192(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.title === void 0 && (missing0 = "title")) ||
        (data.heading === void 0 && (missing0 = "heading")) ||
        (data.body === void 0 && (missing0 = "body")) ||
        (data.quote === void 0 && (missing0 = "quote")) ||
        (data.small === void 0 && (missing0 = "small"))
      ) {
        validate192.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(
            key0 === "title" ||
            key0 === "heading" ||
            key0 === "body" ||
            key0 === "quote" ||
            key0 === "small"
          )) {
            validate192.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.title !== void 0) {
            let data0 = data.title
            const _errs2 = errors
            const _errs3 = errors
            if (errors === _errs3) {
              if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
                let missing1
                if (
                  (data0.size === void 0 && (missing1 = "size")) ||
                  (data0.lineHeight === void 0 && (missing1 = "lineHeight"))
                ) {
                  validate192.errors = [
                    {
                      instancePath: instancePath + "/title",
                      schemaPath: "#/definitions/styleSize/required",
                      keyword: "required",
                      params: { missingProperty: missing1 },
                      message: "must have required property '" + missing1 + "'",
                    },
                  ]
                  return false
                } else {
                  const _errs6 = errors
                  for (const key1 in data0) {
                    if (!(key1 === "size" || key1 === "lineHeight")) {
                      validate192.errors = [
                        {
                          instancePath: instancePath + "/title",
                          schemaPath:
                            "#/definitions/styleSize/additionalProperties",
                          keyword: "additionalProperties",
                          params: { additionalProperty: key1 },
                          message: "must NOT have additional properties",
                        },
                      ]
                      return false
                      break
                    }
                  }
                  if (_errs6 === errors) {
                    if (data0.size !== void 0) {
                      let data1 = data0.size
                      const _errs7 = errors
                      if (!(
                        typeof data1 == "number" &&
                        !(data1 % 1) &&
                        !isNaN(data1) &&
                        isFinite(data1)
                      )) {
                        validate192.errors = [
                          {
                            instancePath: instancePath + "/title/size",
                            schemaPath:
                              "#/definitions/styleSize/properties/size/type",
                            keyword: "type",
                            params: { type: "integer" },
                            message: "must be integer",
                          },
                        ]
                        return false
                      }
                      if (errors === _errs7) {
                        if (typeof data1 == "number" && isFinite(data1)) {
                          if (data1 > 48 || isNaN(data1)) {
                            validate192.errors = [
                              {
                                instancePath: instancePath + "/title/size",
                                schemaPath:
                                  "#/definitions/styleSize/properties/size/maximum",
                                keyword: "maximum",
                                params: { comparison: "<=", limit: 48 },
                                message: "must be <= 48",
                              },
                            ]
                            return false
                          } else {
                            if (data1 < 10 || isNaN(data1)) {
                              validate192.errors = [
                                {
                                  instancePath: instancePath + "/title/size",
                                  schemaPath:
                                    "#/definitions/styleSize/properties/size/minimum",
                                  keyword: "minimum",
                                  params: { comparison: ">=", limit: 10 },
                                  message: "must be >= 10",
                                },
                              ]
                              return false
                            }
                          }
                        }
                      }
                      var valid2 = _errs7 === errors
                    } else {
                      var valid2 = true
                    }
                    if (valid2) {
                      if (data0.lineHeight !== void 0) {
                        let data2 = data0.lineHeight
                        const _errs9 = errors
                        if (errors === _errs9) {
                          if (typeof data2 == "number" && isFinite(data2)) {
                            if (data2 > 2 || isNaN(data2)) {
                              validate192.errors = [
                                {
                                  instancePath:
                                    instancePath + "/title/lineHeight",
                                  schemaPath:
                                    "#/definitions/styleSize/properties/lineHeight/maximum",
                                  keyword: "maximum",
                                  params: { comparison: "<=", limit: 2 },
                                  message: "must be <= 2",
                                },
                              ]
                              return false
                            } else {
                              if (data2 < 1 || isNaN(data2)) {
                                validate192.errors = [
                                  {
                                    instancePath:
                                      instancePath + "/title/lineHeight",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/lineHeight/minimum",
                                    keyword: "minimum",
                                    params: { comparison: ">=", limit: 1 },
                                    message: "must be >= 1",
                                  },
                                ]
                                return false
                              }
                            }
                          } else {
                            validate192.errors = [
                              {
                                instancePath:
                                  instancePath + "/title/lineHeight",
                                schemaPath:
                                  "#/definitions/styleSize/properties/lineHeight/type",
                                keyword: "type",
                                params: { type: "number" },
                                message: "must be number",
                              },
                            ]
                            return false
                          }
                        }
                        var valid2 = _errs9 === errors
                      } else {
                        var valid2 = true
                      }
                    }
                  }
                }
              } else {
                validate192.errors = [
                  {
                    instancePath: instancePath + "/title",
                    schemaPath: "#/definitions/styleSize/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.heading !== void 0) {
              let data3 = data.heading
              const _errs11 = errors
              const _errs12 = errors
              if (errors === _errs12) {
                if (
                  data3 &&
                  typeof data3 == "object" &&
                  !Array.isArray(data3)
                ) {
                  let missing2
                  if (
                    (data3.size === void 0 && (missing2 = "size")) ||
                    (data3.lineHeight === void 0 && (missing2 = "lineHeight"))
                  ) {
                    validate192.errors = [
                      {
                        instancePath: instancePath + "/heading",
                        schemaPath: "#/definitions/styleSize/required",
                        keyword: "required",
                        params: { missingProperty: missing2 },
                        message:
                          "must have required property '" + missing2 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs15 = errors
                    for (const key2 in data3) {
                      if (!(key2 === "size" || key2 === "lineHeight")) {
                        validate192.errors = [
                          {
                            instancePath: instancePath + "/heading",
                            schemaPath:
                              "#/definitions/styleSize/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key2 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs15 === errors) {
                      if (data3.size !== void 0) {
                        let data4 = data3.size
                        const _errs16 = errors
                        if (!(
                          typeof data4 == "number" &&
                          !(data4 % 1) &&
                          !isNaN(data4) &&
                          isFinite(data4)
                        )) {
                          validate192.errors = [
                            {
                              instancePath: instancePath + "/heading/size",
                              schemaPath:
                                "#/definitions/styleSize/properties/size/type",
                              keyword: "type",
                              params: { type: "integer" },
                              message: "must be integer",
                            },
                          ]
                          return false
                        }
                        if (errors === _errs16) {
                          if (typeof data4 == "number" && isFinite(data4)) {
                            if (data4 > 48 || isNaN(data4)) {
                              validate192.errors = [
                                {
                                  instancePath: instancePath + "/heading/size",
                                  schemaPath:
                                    "#/definitions/styleSize/properties/size/maximum",
                                  keyword: "maximum",
                                  params: { comparison: "<=", limit: 48 },
                                  message: "must be <= 48",
                                },
                              ]
                              return false
                            } else {
                              if (data4 < 10 || isNaN(data4)) {
                                validate192.errors = [
                                  {
                                    instancePath:
                                      instancePath + "/heading/size",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/size/minimum",
                                    keyword: "minimum",
                                    params: { comparison: ">=", limit: 10 },
                                    message: "must be >= 10",
                                  },
                                ]
                                return false
                              }
                            }
                          }
                        }
                        var valid4 = _errs16 === errors
                      } else {
                        var valid4 = true
                      }
                      if (valid4) {
                        if (data3.lineHeight !== void 0) {
                          let data5 = data3.lineHeight
                          const _errs18 = errors
                          if (errors === _errs18) {
                            if (typeof data5 == "number" && isFinite(data5)) {
                              if (data5 > 2 || isNaN(data5)) {
                                validate192.errors = [
                                  {
                                    instancePath:
                                      instancePath + "/heading/lineHeight",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/lineHeight/maximum",
                                    keyword: "maximum",
                                    params: { comparison: "<=", limit: 2 },
                                    message: "must be <= 2",
                                  },
                                ]
                                return false
                              } else {
                                if (data5 < 1 || isNaN(data5)) {
                                  validate192.errors = [
                                    {
                                      instancePath:
                                        instancePath + "/heading/lineHeight",
                                      schemaPath:
                                        "#/definitions/styleSize/properties/lineHeight/minimum",
                                      keyword: "minimum",
                                      params: { comparison: ">=", limit: 1 },
                                      message: "must be >= 1",
                                    },
                                  ]
                                  return false
                                }
                              }
                            } else {
                              validate192.errors = [
                                {
                                  instancePath:
                                    instancePath + "/heading/lineHeight",
                                  schemaPath:
                                    "#/definitions/styleSize/properties/lineHeight/type",
                                  keyword: "type",
                                  params: { type: "number" },
                                  message: "must be number",
                                },
                              ]
                              return false
                            }
                          }
                          var valid4 = _errs18 === errors
                        } else {
                          var valid4 = true
                        }
                      }
                    }
                  }
                } else {
                  validate192.errors = [
                    {
                      instancePath: instancePath + "/heading",
                      schemaPath: "#/definitions/styleSize/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs11 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.body !== void 0) {
                let data6 = data.body
                const _errs20 = errors
                const _errs21 = errors
                if (errors === _errs21) {
                  if (
                    data6 &&
                    typeof data6 == "object" &&
                    !Array.isArray(data6)
                  ) {
                    let missing3
                    if (
                      (data6.size === void 0 && (missing3 = "size")) ||
                      (data6.lineHeight === void 0 && (missing3 = "lineHeight"))
                    ) {
                      validate192.errors = [
                        {
                          instancePath: instancePath + "/body",
                          schemaPath: "#/definitions/styleSize/required",
                          keyword: "required",
                          params: { missingProperty: missing3 },
                          message:
                            "must have required property '" + missing3 + "'",
                        },
                      ]
                      return false
                    } else {
                      const _errs24 = errors
                      for (const key3 in data6) {
                        if (!(key3 === "size" || key3 === "lineHeight")) {
                          validate192.errors = [
                            {
                              instancePath: instancePath + "/body",
                              schemaPath:
                                "#/definitions/styleSize/additionalProperties",
                              keyword: "additionalProperties",
                              params: { additionalProperty: key3 },
                              message: "must NOT have additional properties",
                            },
                          ]
                          return false
                          break
                        }
                      }
                      if (_errs24 === errors) {
                        if (data6.size !== void 0) {
                          let data7 = data6.size
                          const _errs25 = errors
                          if (!(
                            typeof data7 == "number" &&
                            !(data7 % 1) &&
                            !isNaN(data7) &&
                            isFinite(data7)
                          )) {
                            validate192.errors = [
                              {
                                instancePath: instancePath + "/body/size",
                                schemaPath:
                                  "#/definitions/styleSize/properties/size/type",
                                keyword: "type",
                                params: { type: "integer" },
                                message: "must be integer",
                              },
                            ]
                            return false
                          }
                          if (errors === _errs25) {
                            if (typeof data7 == "number" && isFinite(data7)) {
                              if (data7 > 48 || isNaN(data7)) {
                                validate192.errors = [
                                  {
                                    instancePath: instancePath + "/body/size",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/size/maximum",
                                    keyword: "maximum",
                                    params: { comparison: "<=", limit: 48 },
                                    message: "must be <= 48",
                                  },
                                ]
                                return false
                              } else {
                                if (data7 < 10 || isNaN(data7)) {
                                  validate192.errors = [
                                    {
                                      instancePath: instancePath + "/body/size",
                                      schemaPath:
                                        "#/definitions/styleSize/properties/size/minimum",
                                      keyword: "minimum",
                                      params: { comparison: ">=", limit: 10 },
                                      message: "must be >= 10",
                                    },
                                  ]
                                  return false
                                }
                              }
                            }
                          }
                          var valid6 = _errs25 === errors
                        } else {
                          var valid6 = true
                        }
                        if (valid6) {
                          if (data6.lineHeight !== void 0) {
                            let data8 = data6.lineHeight
                            const _errs27 = errors
                            if (errors === _errs27) {
                              if (typeof data8 == "number" && isFinite(data8)) {
                                if (data8 > 2 || isNaN(data8)) {
                                  validate192.errors = [
                                    {
                                      instancePath:
                                        instancePath + "/body/lineHeight",
                                      schemaPath:
                                        "#/definitions/styleSize/properties/lineHeight/maximum",
                                      keyword: "maximum",
                                      params: { comparison: "<=", limit: 2 },
                                      message: "must be <= 2",
                                    },
                                  ]
                                  return false
                                } else {
                                  if (data8 < 1 || isNaN(data8)) {
                                    validate192.errors = [
                                      {
                                        instancePath:
                                          instancePath + "/body/lineHeight",
                                        schemaPath:
                                          "#/definitions/styleSize/properties/lineHeight/minimum",
                                        keyword: "minimum",
                                        params: { comparison: ">=", limit: 1 },
                                        message: "must be >= 1",
                                      },
                                    ]
                                    return false
                                  }
                                }
                              } else {
                                validate192.errors = [
                                  {
                                    instancePath:
                                      instancePath + "/body/lineHeight",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/lineHeight/type",
                                    keyword: "type",
                                    params: { type: "number" },
                                    message: "must be number",
                                  },
                                ]
                                return false
                              }
                            }
                            var valid6 = _errs27 === errors
                          } else {
                            var valid6 = true
                          }
                        }
                      }
                    }
                  } else {
                    validate192.errors = [
                      {
                        instancePath: instancePath + "/body",
                        schemaPath: "#/definitions/styleSize/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs20 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.quote !== void 0) {
                  let data9 = data.quote
                  const _errs29 = errors
                  const _errs30 = errors
                  if (errors === _errs30) {
                    if (
                      data9 &&
                      typeof data9 == "object" &&
                      !Array.isArray(data9)
                    ) {
                      let missing4
                      if (
                        (data9.size === void 0 && (missing4 = "size")) ||
                        (data9.lineHeight === void 0 &&
                          (missing4 = "lineHeight"))
                      ) {
                        validate192.errors = [
                          {
                            instancePath: instancePath + "/quote",
                            schemaPath: "#/definitions/styleSize/required",
                            keyword: "required",
                            params: { missingProperty: missing4 },
                            message:
                              "must have required property '" + missing4 + "'",
                          },
                        ]
                        return false
                      } else {
                        const _errs33 = errors
                        for (const key4 in data9) {
                          if (!(key4 === "size" || key4 === "lineHeight")) {
                            validate192.errors = [
                              {
                                instancePath: instancePath + "/quote",
                                schemaPath:
                                  "#/definitions/styleSize/additionalProperties",
                                keyword: "additionalProperties",
                                params: { additionalProperty: key4 },
                                message: "must NOT have additional properties",
                              },
                            ]
                            return false
                            break
                          }
                        }
                        if (_errs33 === errors) {
                          if (data9.size !== void 0) {
                            let data10 = data9.size
                            const _errs34 = errors
                            if (!(
                              typeof data10 == "number" &&
                              !(data10 % 1) &&
                              !isNaN(data10) &&
                              isFinite(data10)
                            )) {
                              validate192.errors = [
                                {
                                  instancePath: instancePath + "/quote/size",
                                  schemaPath:
                                    "#/definitions/styleSize/properties/size/type",
                                  keyword: "type",
                                  params: { type: "integer" },
                                  message: "must be integer",
                                },
                              ]
                              return false
                            }
                            if (errors === _errs34) {
                              if (
                                typeof data10 == "number" &&
                                isFinite(data10)
                              ) {
                                if (data10 > 48 || isNaN(data10)) {
                                  validate192.errors = [
                                    {
                                      instancePath:
                                        instancePath + "/quote/size",
                                      schemaPath:
                                        "#/definitions/styleSize/properties/size/maximum",
                                      keyword: "maximum",
                                      params: { comparison: "<=", limit: 48 },
                                      message: "must be <= 48",
                                    },
                                  ]
                                  return false
                                } else {
                                  if (data10 < 10 || isNaN(data10)) {
                                    validate192.errors = [
                                      {
                                        instancePath:
                                          instancePath + "/quote/size",
                                        schemaPath:
                                          "#/definitions/styleSize/properties/size/minimum",
                                        keyword: "minimum",
                                        params: { comparison: ">=", limit: 10 },
                                        message: "must be >= 10",
                                      },
                                    ]
                                    return false
                                  }
                                }
                              }
                            }
                            var valid8 = _errs34 === errors
                          } else {
                            var valid8 = true
                          }
                          if (valid8) {
                            if (data9.lineHeight !== void 0) {
                              let data11 = data9.lineHeight
                              const _errs36 = errors
                              if (errors === _errs36) {
                                if (
                                  typeof data11 == "number" &&
                                  isFinite(data11)
                                ) {
                                  if (data11 > 2 || isNaN(data11)) {
                                    validate192.errors = [
                                      {
                                        instancePath:
                                          instancePath + "/quote/lineHeight",
                                        schemaPath:
                                          "#/definitions/styleSize/properties/lineHeight/maximum",
                                        keyword: "maximum",
                                        params: { comparison: "<=", limit: 2 },
                                        message: "must be <= 2",
                                      },
                                    ]
                                    return false
                                  } else {
                                    if (data11 < 1 || isNaN(data11)) {
                                      validate192.errors = [
                                        {
                                          instancePath:
                                            instancePath + "/quote/lineHeight",
                                          schemaPath:
                                            "#/definitions/styleSize/properties/lineHeight/minimum",
                                          keyword: "minimum",
                                          params: {
                                            comparison: ">=",
                                            limit: 1,
                                          },
                                          message: "must be >= 1",
                                        },
                                      ]
                                      return false
                                    }
                                  }
                                } else {
                                  validate192.errors = [
                                    {
                                      instancePath:
                                        instancePath + "/quote/lineHeight",
                                      schemaPath:
                                        "#/definitions/styleSize/properties/lineHeight/type",
                                      keyword: "type",
                                      params: { type: "number" },
                                      message: "must be number",
                                    },
                                  ]
                                  return false
                                }
                              }
                              var valid8 = _errs36 === errors
                            } else {
                              var valid8 = true
                            }
                          }
                        }
                      }
                    } else {
                      validate192.errors = [
                        {
                          instancePath: instancePath + "/quote",
                          schemaPath: "#/definitions/styleSize/type",
                          keyword: "type",
                          params: { type: "object" },
                          message: "must be object",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs29 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.small !== void 0) {
                    let data12 = data.small
                    const _errs38 = errors
                    const _errs39 = errors
                    if (errors === _errs39) {
                      if (
                        data12 &&
                        typeof data12 == "object" &&
                        !Array.isArray(data12)
                      ) {
                        let missing5
                        if (
                          (data12.size === void 0 && (missing5 = "size")) ||
                          (data12.lineHeight === void 0 &&
                            (missing5 = "lineHeight"))
                        ) {
                          validate192.errors = [
                            {
                              instancePath: instancePath + "/small",
                              schemaPath: "#/definitions/styleSize/required",
                              keyword: "required",
                              params: { missingProperty: missing5 },
                              message:
                                "must have required property '" +
                                missing5 +
                                "'",
                            },
                          ]
                          return false
                        } else {
                          const _errs42 = errors
                          for (const key5 in data12) {
                            if (!(key5 === "size" || key5 === "lineHeight")) {
                              validate192.errors = [
                                {
                                  instancePath: instancePath + "/small",
                                  schemaPath:
                                    "#/definitions/styleSize/additionalProperties",
                                  keyword: "additionalProperties",
                                  params: { additionalProperty: key5 },
                                  message:
                                    "must NOT have additional properties",
                                },
                              ]
                              return false
                              break
                            }
                          }
                          if (_errs42 === errors) {
                            if (data12.size !== void 0) {
                              let data13 = data12.size
                              const _errs43 = errors
                              if (!(
                                typeof data13 == "number" &&
                                !(data13 % 1) &&
                                !isNaN(data13) &&
                                isFinite(data13)
                              )) {
                                validate192.errors = [
                                  {
                                    instancePath: instancePath + "/small/size",
                                    schemaPath:
                                      "#/definitions/styleSize/properties/size/type",
                                    keyword: "type",
                                    params: { type: "integer" },
                                    message: "must be integer",
                                  },
                                ]
                                return false
                              }
                              if (errors === _errs43) {
                                if (
                                  typeof data13 == "number" &&
                                  isFinite(data13)
                                ) {
                                  if (data13 > 48 || isNaN(data13)) {
                                    validate192.errors = [
                                      {
                                        instancePath:
                                          instancePath + "/small/size",
                                        schemaPath:
                                          "#/definitions/styleSize/properties/size/maximum",
                                        keyword: "maximum",
                                        params: { comparison: "<=", limit: 48 },
                                        message: "must be <= 48",
                                      },
                                    ]
                                    return false
                                  } else {
                                    if (data13 < 10 || isNaN(data13)) {
                                      validate192.errors = [
                                        {
                                          instancePath:
                                            instancePath + "/small/size",
                                          schemaPath:
                                            "#/definitions/styleSize/properties/size/minimum",
                                          keyword: "minimum",
                                          params: {
                                            comparison: ">=",
                                            limit: 10,
                                          },
                                          message: "must be >= 10",
                                        },
                                      ]
                                      return false
                                    }
                                  }
                                }
                              }
                              var valid10 = _errs43 === errors
                            } else {
                              var valid10 = true
                            }
                            if (valid10) {
                              if (data12.lineHeight !== void 0) {
                                let data14 = data12.lineHeight
                                const _errs45 = errors
                                if (errors === _errs45) {
                                  if (
                                    typeof data14 == "number" &&
                                    isFinite(data14)
                                  ) {
                                    if (data14 > 2 || isNaN(data14)) {
                                      validate192.errors = [
                                        {
                                          instancePath:
                                            instancePath + "/small/lineHeight",
                                          schemaPath:
                                            "#/definitions/styleSize/properties/lineHeight/maximum",
                                          keyword: "maximum",
                                          params: {
                                            comparison: "<=",
                                            limit: 2,
                                          },
                                          message: "must be <= 2",
                                        },
                                      ]
                                      return false
                                    } else {
                                      if (data14 < 1 || isNaN(data14)) {
                                        validate192.errors = [
                                          {
                                            instancePath:
                                              instancePath +
                                              "/small/lineHeight",
                                            schemaPath:
                                              "#/definitions/styleSize/properties/lineHeight/minimum",
                                            keyword: "minimum",
                                            params: {
                                              comparison: ">=",
                                              limit: 1,
                                            },
                                            message: "must be >= 1",
                                          },
                                        ]
                                        return false
                                      }
                                    }
                                  } else {
                                    validate192.errors = [
                                      {
                                        instancePath:
                                          instancePath + "/small/lineHeight",
                                        schemaPath:
                                          "#/definitions/styleSize/properties/lineHeight/type",
                                        keyword: "type",
                                        params: { type: "number" },
                                        message: "must be number",
                                      },
                                    ]
                                    return false
                                  }
                                }
                                var valid10 = _errs45 === errors
                              } else {
                                var valid10 = true
                              }
                            }
                          }
                        }
                      } else {
                        validate192.errors = [
                          {
                            instancePath: instancePath + "/small",
                            schemaPath: "#/definitions/styleSize/type",
                            keyword: "type",
                            params: { type: "object" },
                            message: "must be object",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs38 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate192.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate192.errors = vErrors
  return errors === 0
}
function validate177(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.v === void 0 && (missing0 = "v")) ||
        (data.darkMode === void 0 && (missing0 = "darkMode")) ||
        (data.colors === void 0 && (missing0 = "colors")) ||
        (data.roles === void 0 && (missing0 = "roles")) ||
        (data.tints === void 0 && (missing0 = "tints")) ||
        (data.badges === void 0 && (missing0 = "badges")) ||
        (data.buttons === void 0 && (missing0 = "buttons")) ||
        (data.fields === void 0 && (missing0 = "fields")) ||
        (data.fonts === void 0 && (missing0 = "fonts")) ||
        (data.fontRoles === void 0 && (missing0 = "fontRoles")) ||
        (data.sizes === void 0 && (missing0 = "sizes")) ||
        (data.radius === void 0 && (missing0 = "radius")) ||
        (data.imageRadius === void 0 && (missing0 = "imageRadius")) ||
        (data.shadow === void 0 && (missing0 = "shadow")) ||
        (data.underlineLinks === void 0 && (missing0 = "underlineLinks"))
      ) {
        validate177.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!func19.call(schema111.properties, key0)) {
            validate177.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.v !== void 0) {
            const _errs3 = errors
            if (1 !== data.v) {
              validate177.errors = [
                {
                  instancePath: instancePath + "/v",
                  schemaPath: "#/properties/v/const",
                  keyword: "const",
                  params: { allowedValue: 1 },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.darkMode !== void 0) {
              let data1 = data.darkMode
              const _errs4 = errors
              if (!(
                data1 === "auto" ||
                data1 === "light" ||
                data1 === "dark"
              )) {
                validate177.errors = [
                  {
                    instancePath: instancePath + "/darkMode",
                    schemaPath: "#/properties/darkMode/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: schema111.properties.darkMode.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.colors !== void 0) {
                let data2 = data.colors
                const _errs5 = errors
                if (errors === _errs5) {
                  if (Array.isArray(data2)) {
                    if (data2.length > 60) {
                      validate177.errors = [
                        {
                          instancePath: instancePath + "/colors",
                          schemaPath: "#/properties/colors/maxItems",
                          keyword: "maxItems",
                          params: { limit: 60 },
                          message: "must NOT have more than 60 items",
                        },
                      ]
                      return false
                    } else {
                      if (data2.length < 1) {
                        validate177.errors = [
                          {
                            instancePath: instancePath + "/colors",
                            schemaPath: "#/properties/colors/minItems",
                            keyword: "minItems",
                            params: { limit: 1 },
                            message: "must NOT have fewer than 1 items",
                          },
                        ]
                        return false
                      } else {
                        var valid1 = true
                        const len0 = data2.length
                        for (let i0 = 0; i0 < len0; i0++) {
                          const _errs7 = errors
                          if (
                            !validate178(data2[i0], {
                              instancePath: instancePath + "/colors/" + i0,
                              parentData: data2,
                              parentDataProperty: i0,
                              rootData,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validate178.errors
                                : vErrors.concat(validate178.errors)
                            errors = vErrors.length
                          }
                          var valid1 = _errs7 === errors
                          if (!valid1) {
                            break
                          }
                        }
                      }
                    }
                  } else {
                    validate177.errors = [
                      {
                        instancePath: instancePath + "/colors",
                        schemaPath: "#/properties/colors/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs5 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.roles !== void 0) {
                  const _errs8 = errors
                  if (
                    !validate180(data.roles, {
                      instancePath: instancePath + "/roles",
                      parentData: data,
                      parentDataProperty: "roles",
                      rootData,
                    })
                  ) {
                    vErrors =
                      vErrors === null
                        ? validate180.errors
                        : vErrors.concat(validate180.errors)
                    errors = vErrors.length
                  }
                  var valid0 = _errs8 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.tints !== void 0) {
                    let data5 = data.tints
                    const _errs9 = errors
                    if (errors === _errs9) {
                      if (Array.isArray(data5)) {
                        if (data5.length > 30) {
                          validate177.errors = [
                            {
                              instancePath: instancePath + "/tints",
                              schemaPath: "#/properties/tints/maxItems",
                              keyword: "maxItems",
                              params: { limit: 30 },
                              message: "must NOT have more than 30 items",
                            },
                          ]
                          return false
                        } else {
                          if (data5.length < 1) {
                            validate177.errors = [
                              {
                                instancePath: instancePath + "/tints",
                                schemaPath: "#/properties/tints/minItems",
                                keyword: "minItems",
                                params: { limit: 1 },
                                message: "must NOT have fewer than 1 items",
                              },
                            ]
                            return false
                          } else {
                            var valid2 = true
                            const len1 = data5.length
                            for (let i1 = 0; i1 < len1; i1++) {
                              const _errs11 = errors
                              if (
                                !validate182(data5[i1], {
                                  instancePath: instancePath + "/tints/" + i1,
                                  parentData: data5,
                                  parentDataProperty: i1,
                                  rootData,
                                })
                              ) {
                                vErrors =
                                  vErrors === null
                                    ? validate182.errors
                                    : vErrors.concat(validate182.errors)
                                errors = vErrors.length
                              }
                              var valid2 = _errs11 === errors
                              if (!valid2) {
                                break
                              }
                            }
                          }
                        }
                      } else {
                        validate177.errors = [
                          {
                            instancePath: instancePath + "/tints",
                            schemaPath: "#/properties/tints/type",
                            keyword: "type",
                            params: { type: "array" },
                            message: "must be array",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs9 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.badges !== void 0) {
                      let data7 = data.badges
                      const _errs12 = errors
                      if (errors === _errs12) {
                        if (Array.isArray(data7)) {
                          if (data7.length > 30) {
                            validate177.errors = [
                              {
                                instancePath: instancePath + "/badges",
                                schemaPath: "#/properties/badges/maxItems",
                                keyword: "maxItems",
                                params: { limit: 30 },
                                message: "must NOT have more than 30 items",
                              },
                            ]
                            return false
                          } else {
                            if (data7.length < 1) {
                              validate177.errors = [
                                {
                                  instancePath: instancePath + "/badges",
                                  schemaPath: "#/properties/badges/minItems",
                                  keyword: "minItems",
                                  params: { limit: 1 },
                                  message: "must NOT have fewer than 1 items",
                                },
                              ]
                              return false
                            } else {
                              var valid3 = true
                              const len2 = data7.length
                              for (let i2 = 0; i2 < len2; i2++) {
                                const _errs14 = errors
                                if (
                                  !validate184(data7[i2], {
                                    instancePath:
                                      instancePath + "/badges/" + i2,
                                    parentData: data7,
                                    parentDataProperty: i2,
                                    rootData,
                                  })
                                ) {
                                  vErrors =
                                    vErrors === null
                                      ? validate184.errors
                                      : vErrors.concat(validate184.errors)
                                  errors = vErrors.length
                                }
                                var valid3 = _errs14 === errors
                                if (!valid3) {
                                  break
                                }
                              }
                            }
                          }
                        } else {
                          validate177.errors = [
                            {
                              instancePath: instancePath + "/badges",
                              schemaPath: "#/properties/badges/type",
                              keyword: "type",
                              params: { type: "array" },
                              message: "must be array",
                            },
                          ]
                          return false
                        }
                      }
                      var valid0 = _errs12 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.buttons !== void 0) {
                        let data9 = data.buttons
                        const _errs15 = errors
                        if (errors === _errs15) {
                          if (Array.isArray(data9)) {
                            if (data9.length > 30) {
                              validate177.errors = [
                                {
                                  instancePath: instancePath + "/buttons",
                                  schemaPath: "#/properties/buttons/maxItems",
                                  keyword: "maxItems",
                                  params: { limit: 30 },
                                  message: "must NOT have more than 30 items",
                                },
                              ]
                              return false
                            } else {
                              if (data9.length < 1) {
                                validate177.errors = [
                                  {
                                    instancePath: instancePath + "/buttons",
                                    schemaPath: "#/properties/buttons/minItems",
                                    keyword: "minItems",
                                    params: { limit: 1 },
                                    message: "must NOT have fewer than 1 items",
                                  },
                                ]
                                return false
                              } else {
                                var valid4 = true
                                const len3 = data9.length
                                for (let i3 = 0; i3 < len3; i3++) {
                                  const _errs17 = errors
                                  if (
                                    !validate186(data9[i3], {
                                      instancePath:
                                        instancePath + "/buttons/" + i3,
                                      parentData: data9,
                                      parentDataProperty: i3,
                                      rootData,
                                    })
                                  ) {
                                    vErrors =
                                      vErrors === null
                                        ? validate186.errors
                                        : vErrors.concat(validate186.errors)
                                    errors = vErrors.length
                                  }
                                  var valid4 = _errs17 === errors
                                  if (!valid4) {
                                    break
                                  }
                                }
                              }
                            }
                          } else {
                            validate177.errors = [
                              {
                                instancePath: instancePath + "/buttons",
                                schemaPath: "#/properties/buttons/type",
                                keyword: "type",
                                params: { type: "array" },
                                message: "must be array",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs15 === errors
                      } else {
                        var valid0 = true
                      }
                      if (valid0) {
                        if (data.fields !== void 0) {
                          let data11 = data.fields
                          const _errs18 = errors
                          if (!(
                            data11 === "outline" ||
                            data11 === "filled" ||
                            data11 === "underline"
                          )) {
                            validate177.errors = [
                              {
                                instancePath: instancePath + "/fields",
                                schemaPath: "#/properties/fields/enum",
                                keyword: "enum",
                                params: {
                                  allowedValues:
                                    schema111.properties.fields.enum,
                                },
                                message:
                                  "must be equal to one of the allowed values",
                              },
                            ]
                            return false
                          }
                          var valid0 = _errs18 === errors
                        } else {
                          var valid0 = true
                        }
                        if (valid0) {
                          if (data.fonts !== void 0) {
                            let data12 = data.fonts
                            const _errs19 = errors
                            if (errors === _errs19) {
                              if (Array.isArray(data12)) {
                                if (data12.length > 12) {
                                  validate177.errors = [
                                    {
                                      instancePath: instancePath + "/fonts",
                                      schemaPath: "#/properties/fonts/maxItems",
                                      keyword: "maxItems",
                                      params: { limit: 12 },
                                      message:
                                        "must NOT have more than 12 items",
                                    },
                                  ]
                                  return false
                                } else {
                                  if (data12.length < 3) {
                                    validate177.errors = [
                                      {
                                        instancePath: instancePath + "/fonts",
                                        schemaPath:
                                          "#/properties/fonts/minItems",
                                        keyword: "minItems",
                                        params: { limit: 3 },
                                        message:
                                          "must NOT have fewer than 3 items",
                                      },
                                    ]
                                    return false
                                  } else {
                                    var valid5 = true
                                    const len4 = data12.length
                                    for (let i4 = 0; i4 < len4; i4++) {
                                      const _errs21 = errors
                                      if (
                                        !validate188(data12[i4], {
                                          instancePath:
                                            instancePath + "/fonts/" + i4,
                                          parentData: data12,
                                          parentDataProperty: i4,
                                          rootData,
                                        })
                                      ) {
                                        vErrors =
                                          vErrors === null
                                            ? validate188.errors
                                            : vErrors.concat(validate188.errors)
                                        errors = vErrors.length
                                      }
                                      var valid5 = _errs21 === errors
                                      if (!valid5) {
                                        break
                                      }
                                    }
                                  }
                                }
                              } else {
                                validate177.errors = [
                                  {
                                    instancePath: instancePath + "/fonts",
                                    schemaPath: "#/properties/fonts/type",
                                    keyword: "type",
                                    params: { type: "array" },
                                    message: "must be array",
                                  },
                                ]
                                return false
                              }
                            }
                            var valid0 = _errs19 === errors
                          } else {
                            var valid0 = true
                          }
                          if (valid0) {
                            if (data.fontRoles !== void 0) {
                              const _errs22 = errors
                              if (
                                !validate190(data.fontRoles, {
                                  instancePath: instancePath + "/fontRoles",
                                  parentData: data,
                                  parentDataProperty: "fontRoles",
                                  rootData,
                                })
                              ) {
                                vErrors =
                                  vErrors === null
                                    ? validate190.errors
                                    : vErrors.concat(validate190.errors)
                                errors = vErrors.length
                              }
                              var valid0 = _errs22 === errors
                            } else {
                              var valid0 = true
                            }
                            if (valid0) {
                              if (data.sizes !== void 0) {
                                const _errs23 = errors
                                if (
                                  !validate192(data.sizes, {
                                    instancePath: instancePath + "/sizes",
                                    parentData: data,
                                    parentDataProperty: "sizes",
                                    rootData,
                                  })
                                ) {
                                  vErrors =
                                    vErrors === null
                                      ? validate192.errors
                                      : vErrors.concat(validate192.errors)
                                  errors = vErrors.length
                                }
                                var valid0 = _errs23 === errors
                              } else {
                                var valid0 = true
                              }
                              if (valid0) {
                                if (data.radius !== void 0) {
                                  let data16 = data.radius
                                  const _errs24 = errors
                                  if (!(
                                    typeof data16 == "number" &&
                                    !(data16 % 1) &&
                                    !isNaN(data16) &&
                                    isFinite(data16)
                                  )) {
                                    validate177.errors = [
                                      {
                                        instancePath: instancePath + "/radius",
                                        schemaPath: "#/properties/radius/type",
                                        keyword: "type",
                                        params: { type: "integer" },
                                        message: "must be integer",
                                      },
                                    ]
                                    return false
                                  }
                                  if (errors === _errs24) {
                                    if (
                                      typeof data16 == "number" &&
                                      isFinite(data16)
                                    ) {
                                      if (data16 > 24 || isNaN(data16)) {
                                        validate177.errors = [
                                          {
                                            instancePath:
                                              instancePath + "/radius",
                                            schemaPath:
                                              "#/properties/radius/maximum",
                                            keyword: "maximum",
                                            params: {
                                              comparison: "<=",
                                              limit: 24,
                                            },
                                            message: "must be <= 24",
                                          },
                                        ]
                                        return false
                                      } else {
                                        if (data16 < 0 || isNaN(data16)) {
                                          validate177.errors = [
                                            {
                                              instancePath:
                                                instancePath + "/radius",
                                              schemaPath:
                                                "#/properties/radius/minimum",
                                              keyword: "minimum",
                                              params: {
                                                comparison: ">=",
                                                limit: 0,
                                              },
                                              message: "must be >= 0",
                                            },
                                          ]
                                          return false
                                        }
                                      }
                                    }
                                  }
                                  var valid0 = _errs24 === errors
                                } else {
                                  var valid0 = true
                                }
                                if (valid0) {
                                  if (data.imageRadius !== void 0) {
                                    let data17 = data.imageRadius
                                    const _errs26 = errors
                                    if (!(
                                      typeof data17 == "number" &&
                                      !(data17 % 1) &&
                                      !isNaN(data17) &&
                                      isFinite(data17)
                                    )) {
                                      validate177.errors = [
                                        {
                                          instancePath:
                                            instancePath + "/imageRadius",
                                          schemaPath:
                                            "#/properties/imageRadius/type",
                                          keyword: "type",
                                          params: { type: "integer" },
                                          message: "must be integer",
                                        },
                                      ]
                                      return false
                                    }
                                    if (errors === _errs26) {
                                      if (
                                        typeof data17 == "number" &&
                                        isFinite(data17)
                                      ) {
                                        if (data17 > 24 || isNaN(data17)) {
                                          validate177.errors = [
                                            {
                                              instancePath:
                                                instancePath + "/imageRadius",
                                              schemaPath:
                                                "#/properties/imageRadius/maximum",
                                              keyword: "maximum",
                                              params: {
                                                comparison: "<=",
                                                limit: 24,
                                              },
                                              message: "must be <= 24",
                                            },
                                          ]
                                          return false
                                        } else {
                                          if (data17 < 0 || isNaN(data17)) {
                                            validate177.errors = [
                                              {
                                                instancePath:
                                                  instancePath + "/imageRadius",
                                                schemaPath:
                                                  "#/properties/imageRadius/minimum",
                                                keyword: "minimum",
                                                params: {
                                                  comparison: ">=",
                                                  limit: 0,
                                                },
                                                message: "must be >= 0",
                                              },
                                            ]
                                            return false
                                          }
                                        }
                                      }
                                    }
                                    var valid0 = _errs26 === errors
                                  } else {
                                    var valid0 = true
                                  }
                                  if (valid0) {
                                    if (data.shadow !== void 0) {
                                      let data18 = data.shadow
                                      const _errs28 = errors
                                      if (!(
                                        data18 === "none" ||
                                        data18 === "light" ||
                                        data18 === "medium" ||
                                        data18 === "strong"
                                      )) {
                                        validate177.errors = [
                                          {
                                            instancePath:
                                              instancePath + "/shadow",
                                            schemaPath:
                                              "#/properties/shadow/enum",
                                            keyword: "enum",
                                            params: {
                                              allowedValues:
                                                schema111.properties.shadow
                                                  .enum,
                                            },
                                            message:
                                              "must be equal to one of the allowed values",
                                          },
                                        ]
                                        return false
                                      }
                                      var valid0 = _errs28 === errors
                                    } else {
                                      var valid0 = true
                                    }
                                    if (valid0) {
                                      if (data.underlineLinks !== void 0) {
                                        const _errs29 = errors
                                        if (
                                          typeof data.underlineLinks !==
                                          "boolean"
                                        ) {
                                          validate177.errors = [
                                            {
                                              instancePath:
                                                instancePath +
                                                "/underlineLinks",
                                              schemaPath:
                                                "#/properties/underlineLinks/type",
                                              keyword: "type",
                                              params: { type: "boolean" },
                                              message: "must be boolean",
                                            },
                                          ]
                                          return false
                                        }
                                        var valid0 = _errs29 === errors
                                      } else {
                                        var valid0 = true
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate177.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate177.errors = vErrors
  return errors === 0
}
export { validateStyle }
