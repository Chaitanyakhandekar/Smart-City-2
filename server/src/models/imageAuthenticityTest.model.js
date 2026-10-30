import mongoose, { Schema } from "mongoose";

const imageAuthenticityTestSchema = new Schema(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    complaintImage: {
      type: Schema.Types.ObjectId,
      ref: "ComplaintImage",
      default: null
    },
    imageTarget: {
      type: String,
      enum: ["original", "resolution"],
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    assessment: {
      type: String,
      enum: ["LIKELY_AI_GENERATED", "LIKELY_PHOTOGRAPHIC", "INCONCLUSIVE"],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reasoning: {
      type: [String],
      default: []
    },
    limitations: {
      type: String,
      default:
        "AI-generated image detection is an estimate based on visual clues. It cannot prove whether an image is genuine or AI-generated. Review the evidence and other complaint details before making a decision."
    },
    model: {
      type: String,
      default: "gemini-3.8-flash"
    },
    testedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userRole: {
      type: String,
      enum: ["CITIZEN", "ADMIN", "STAFF"],
      required: true
    }
  },
  { timestamps: true }
);

export const ImageAuthenticityTest = mongoose.model(
  "ImageAuthenticityTest",
  imageAuthenticityTestSchema
);

export default ImageAuthenticityTest;
