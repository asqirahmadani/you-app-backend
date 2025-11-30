import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({
  timestamps: true,
  collection: 'profiles',
})
export class Profile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  displayName: string;

  @Prop({
    type: String,
    enum: ['male', 'female', 'other'],
    required: false,
  })
  gender: string;

  @Prop({
    type: Date,
    required: false,
  })
  birthday: Date;

  @Prop({
    type: String,
    required: false,
  })
  horoscope: string;

  @Prop({
    type: String,
    required: false,
  })
  zodiac: string;

  @Prop({
    type: Number,
    min: 0,
    max: 300,
    required: false,
  })
  height: number;

  @Prop({
    type: Number,
    min: 0,
    max: 500,
    required: false,
  })
  weight: number;

  @Prop({
    type: String,
    maxlength: 1000,
    default: '',
  })
  about: string;

  @Prop({
    type: [String],
    default: [],
    validate: {
      validator: function (interest: string[]) {
        return interest.length <= 10;
      },
      message: 'Maximum 10 interest allowed',
    },
  })
  interests: string[];

  @Prop({
    type: [String],
    default: [],
    validate: {
      validator: function (images: string[]) {
        return images.length <= 6;
      },
      message: 'Maximum 6 images allowed',
    },
  })
  images: string[];

  @Prop({
    type: String,
    default: '',
  })
  avatar: string;

  @Prop({
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    match: /^@[a-zA-Z0-9_]{3,30}$/,
  })
  handle: string;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Indexes
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ handle: 1 });
ProfileSchema.index({ displayName: 'text' });

// Helper
function calculateHoroscope(birthday: Date): string {
  const month = birthday.getMonth() + 1;
  const day = birthday.getDate();

  const horoscopes = [
    { name: 'Capricorn', start: [12, 22], end: [1, 19] },
    { name: 'Aquarius', start: [1, 20], end: [2, 18] },
    { name: 'Pisces', start: [2, 19], end: [3, 20] },
    { name: 'Aries', start: [3, 21], end: [4, 19] },
    { name: 'Taurus', start: [4, 20], end: [5, 20] },
    { name: 'Gemini', start: [5, 21], end: [6, 20] },
    { name: 'Cancer', start: [6, 21], end: [7, 22] },
    { name: 'Leo', start: [7, 23], end: [8, 22] },
    { name: 'Virgo', start: [8, 23], end: [9, 22] },
    { name: 'Libra', start: [9, 23], end: [10, 22] },
    { name: 'Scorpio', start: [10, 23], end: [11, 21] },
    { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
  ];

  for (const sign of horoscopes) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;

    if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay)
    ) {
      return sign.name;
    }
  }

  return 'Capricorn';
}

function calculateZodiac(birthday: Date): string {
  const year = birthday.getFullYear();
  const zodiacs = [
    'Rat',
    'Ox',
    'Tiger',
    'Rabbit',
    'Dragon',
    'Snake',
    'Horse',
    'Goat',
    'Monkey',
    'Rooster',
    'Dog',
    'Pig',
  ];

  const index = (year - 1900) % 12;
  return zodiacs[index];
}

// Pre-save middleware to auto-calculate horoscope and zodiac
ProfileSchema.pre('save', function (next) {
  if (this.birthday) {
    this.horoscope = calculateHoroscope(this.birthday);
    this.zodiac = calculateZodiac(this.birthday);
  }
  next();
});

// Pre-update middleware
ProfileSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;

  if (update.birthday || update.$set.birthday) {
    const birthday = update.birthday || update.$set.birthday;
    if (birthday) {
      const birthdayDate = new Date(birthday);
      if (!update.$set) {
        update.$set = {};
      }
      update.$set.horoscope = calculateHoroscope(birthdayDate);
      update.$set.zodiac = calculateZodiac(birthdayDate);
    }
  }
  next();
});

ProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const { __v, ...sanitized } = ret;
    return sanitized;
  },
});
